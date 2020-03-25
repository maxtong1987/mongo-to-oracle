import { ISqlStatement, ITable } from "./models";
import { SrcObject } from "./src-object";

// e.g. 1234-12-12T12:00:00.000Z , 1234-12-12T00:00:00Z , 1234-12-12T00:00Z , 1234-12-12T00Z
const dateFormat = /\d{4}-\d{2}-\d{2}T\d{2}[:\d{2}]*[.\d{3}]*Z/;

function strConverter(value: string) {
    if (value.match(dateFormat)) {
        return new Date(value);
    }
    return value;
}

/**
 * to extract list of values from srcObject.
 * @param src source object from which values are extracted
 * @param properties list of property names
 */
function getValues(srcObject: SrcObject, properties: string[]) {
    const values: any[] = [];
    properties.forEach((prop) => {
        const value = srcObject.getPropertyValue(prop);
        switch (typeof value) {
            case "number": values.push(Number.isNaN(value) ? null : value.toString()); break;
            case "boolean": values.push(value ? "1" : "0"); break;
            case "string": values.push(strConverter(value)); break;
            default: values.push(value);
        }
    });
    return values;
}

function valuesToBindObject(values: string[]) {
    const bindObj: any = {};
    values.forEach((val, index) => {
        bindObj[index] = { val };
    });
    return bindObj;
}

type SqlFunction = (param: SqlConstructorParam) => ISqlStatement;

export interface SqlConstructorParam {
    src: ITable;
    dest: ITable;
    srcObject: SrcObject;
}

export class SqlConstructor {

    public static insert(param: SqlConstructorParam): ISqlStatement {
        const { src, dest, srcObject } = param;
        const srcColumns = src.keys.concat(src.columns || []);
        const destColumns = dest.keys.concat(dest.columns || []);
        const values = getValues(srcObject, srcColumns);
        const params = values.map((v, index) => `:${index}`);
        const sql = `INSERT INTO ${dest.table} (${destColumns.join(", ")}) VALUES (${params.join(", ")}) `;
        const subStatements = SqlConstructor.getSubStatements(param, SqlConstructor.insert);
        return { sql, values, subStatements };
    }

    public static update(param: SqlConstructorParam): ISqlStatement {
        const { src, dest, srcObject } = param;
        const destColumns = dest.columns || [];
        const srcColumns = src.columns || [];
        // return upsert statement if the destination table contains keys only
        if (destColumns.length === 0) {
            return SqlConstructor.upsert({ src, dest, srcObject });
        }

        // construct array of "A = :a" for SET
        let offset = 0;
        const setPairs = destColumns.map((col, index) => `${col} = :${index + offset}`);

        // construct array of "A = :a" for WHERE
        offset = destColumns.length;
        const wherePairs = dest.keys.map((key, index) => `${key} = :${offset + index}`);
        const values = getValues(srcObject, srcColumns.concat(src.keys));
        const sql = `UPDATE ${dest.table} SET ${setPairs.join(", ")} WHERE ${wherePairs.join(" AND ")}`;
        const subStatements = SqlConstructor.getSubStatements(param, SqlConstructor.update);
        return { sql, values, subStatements };
    }

    public static upsert(param: SqlConstructorParam): ISqlStatement {
        const { src, dest, srcObject } = param;
        const destColumns = dest.columns || [];
        const srcColumns = src.columns || [];
        const values = getValues(srcObject, src.keys.concat(srcColumns));
        const wherePairs = dest.keys.map((key, index) => `${key} = :${index}`);
        let sql = `MERGE INTO ${dest.table} USING dual ON (${wherePairs.join(" AND ")}) `;
        const offset = wherePairs.length;
        const updateSets = destColumns.map((col, index) => `${col} = :${index + offset}`);
        if (updateSets.length > 0) {
            sql += `WHEN MATCHED THEN UPDATE SET ${updateSets.join(", ")} `;
        }
        const inserts = dest.keys.concat(destColumns);
        sql += `WHEN NOT MATCHED THEN INSERT (${inserts.join(", ")}) `;
        sql += `VALUES (${values.map((v, index) => `:${index}`).join(", ")})`;
        const subStatements = SqlConstructor.getSubStatements(param, SqlConstructor.upsert);
        return { sql, values: values.concat(values), subStatements };
    }

    public static delete(param: SqlConstructorParam): ISqlStatement {
        const { src, dest, srcObject } = param;
        const destKeys = dest.keys.filter((key, index) => {
            return srcObject.isRoot || src.keys[index].startsWith("../");
        });
        const srcKeys = src.keys.filter((key) => {
            return srcObject.isRoot || key.startsWith("../");
        });
        const wherePairs = destKeys.map((key, index) => `${key} = :${index}`);
        const sql = `DELETE FROM ${dest.table} WHERE ${wherePairs.join(" AND ")}`;
        const values = getValues(srcObject, srcKeys);
        const subStatements = SqlConstructor.getSubStatements(param, SqlConstructor.delete, true);
        return { sql, values, subStatements };
    }

    public static deleteAll(param: SqlConstructorParam): ISqlStatement {
        const { dest } = param;
        const sql = `DELETE FROM ${dest.table}`;
        return { sql, values: [] };
    }

    public static getSubStatements(
        { src, dest, srcObject: parent }: SqlConstructorParam,
        operation: SqlFunction,
        allowEmptySrcObject: boolean = false): ISqlStatement[] {
        if (!src.embeddedColumns || !dest.embeddedColumns) {
            return [];
        }
        const subStatements: ISqlStatement[] = [];
        for (let i = 0; i < src.embeddedColumns.length; i++) {
            const srcCol = src.embeddedColumns[i];
            const destCol = dest.embeddedColumns[i];
            const values = parent.getPropertyValue(srcCol.table);
            if (!values && !allowEmptySrcObject) { continue; }
            if (Array.isArray(values)) {
                for (const value of values) {
                    const param = { dest: destCol, src: srcCol, srcObject: new SrcObject(value, parent) };
                    const subStatement = operation(param);
                    subStatement.subStatements = this.getSubStatements(param, operation, allowEmptySrcObject);
                    subStatements.push(subStatement);
                }
            } else {
                const param = { dest: destCol, src: srcCol, srcObject: new SrcObject(values, parent) };
                const subStatement = operation(param);
                subStatement.subStatements = this.getSubStatements(param, operation, allowEmptySrcObject);
                subStatements.push(subStatement);
            }
        }
        return subStatements;
    }
}
