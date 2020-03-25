import { Connection } from "oracledb";
import { ISqlStatement } from "./models";
import { Logger } from "./loggers/logger";
import { SqlConstructor, SqlConstructorParam } from "./sql-constructor";

export class OracleExecuter {

    protected _oracle: Connection;

    constructor(oracle: Connection) {
        this._oracle = oracle;
    }

    protected async insert(param: SqlConstructorParam) {
        try {
            const sqlStatement = SqlConstructor.insert(param);
            await this.execute(sqlStatement);
        } catch (err) {
            Logger.error(err);
        }
    }

    protected async upsert(param: SqlConstructorParam) {
        try {
            const sqlStatement = SqlConstructor.upsert(param);
            await this.execute(sqlStatement);
        } catch (err) {
            Logger.error(err);
        }
    }

    protected async update(param: SqlConstructorParam) {
        try {
            const sqlStatement = SqlConstructor.update(param);
            const result = await this.execute(sqlStatement);
            if (result.rowsAffected === 0) {
                let warning = "the following update statement update nothing at all:";
                warning += `\n${JSON.stringify(sqlStatement)}`;
                warning += "\ntrying to insert the missing record automatically...";
                Logger.warn(warning);
                await this.insert(param);
            } else if (result.rowsAffected > 1) {
                let warning = "the following update statement affects more than one record:";
                warning += `\n${JSON.stringify(sqlStatement)}`;
                Logger.warn(warning);
            }
        } catch (err) {
            Logger.error(err);
        }
    }

    protected async delete(param: SqlConstructorParam) {
        try {
            const sqlStatement = SqlConstructor.delete(param);
            const result = await this.execute(sqlStatement);
            if (result.rowsAffected === 0) {
                let warning = "the following delete statement remove no records:";
                warning += `\n${JSON.stringify(sqlStatement)}`;
                Logger.warn(warning);
            } else if (result.rowsAffected > 1) {
                let warning = "the following delete statement removes more than one record:";
                warning += `\n${JSON.stringify(sqlStatement)}`;
                Logger.warn(warning);
            }
        } catch (err) {
            Logger.error(err);
        }
    }

    protected async deleteAll(param: SqlConstructorParam) {
        try {
            const sqlStatement = SqlConstructor.deleteAll(param);
            const result = await this.execute(sqlStatement);
            Logger.info(` ${result.rowsAffected} records are removed from ${param.dest.table}`);
        } catch (err) {
            Logger.error(err);
        }
    }

    protected async execute(sqlStatement: ISqlStatement) {
        Logger.info(JSON.stringify(sqlStatement));
        const { sql, values, subStatements } = sqlStatement;
        sqlStatement.result = await this._oracle.execute(sql, values, { autoCommit: true });
        if (subStatements) {
            for (const subStatement of subStatements) {
                await this.execute(subStatement);
            }
        }
        Logger.debug(`${JSON.stringify(sqlStatement.result)}`);
        return sqlStatement.result;
    }

    protected async executeMany(sqlStatements: ISqlStatement[], isDebug: boolean = false) {
        let rowsAffected = 0;
        if (isDebug) {
            for (const sqlStatement of sqlStatements) {
                const result = await this.execute(sqlStatement);
                rowsAffected += result.rowsAffected;
            }
            return { rowsAffected };
        }
        const sqlDictionary: any = {};
        groupSqlStatements(sqlDictionary, sqlStatements);
        const promises = [];
        for (const [sql, values] of Object.entries<any[]>(sqlDictionary)) {
            Logger.info(`oracle-executer.executeMany: ${sql} (values count: ${values.length})`);
            const promise = this._oracle.executeMany(sql, values, { autoCommit: true });
            promises.push(promise);
        }
        const results = await Promise.all(promises);
        rowsAffected = results.map((result) => result.rowsAffected).reduce((a, b) => a + b, 0);
        return { rowsAffected };
    }
}
/**
 * This is a helper function that allow OracleExecuter.executeMany to execute multiple SqlStatements
 * that share the same prepared statement but different values in batch.
 * @param sqlDictionary sqlStatements dictionary that use sql as unique key to group their values together.
 * @param sqlStatements a collection of SqlStatements that going to execute all together
 */
function groupSqlStatements(sqlDictionary: any, sqlStatements: ISqlStatement[] | undefined) {
    if (!sqlStatements) { return; }
    for (const { sql, values, subStatements } of sqlStatements) {
        if (!sqlDictionary[sql]) {
            sqlDictionary[sql] = [];
        }
        sqlDictionary[sql].push(values);
        groupSqlStatements(sqlDictionary, subStatements);
    }
}
