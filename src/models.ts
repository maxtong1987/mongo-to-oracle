import { Result } from "oracledb";

export interface ITable {
    table: string;
    keys: string[];
    columns?: string[];
    embeddedColumns?: ITable[];
    pipeline?: any[];
    query?: any;
}

export interface IOptionTable<T> extends ITable {
    options?: T;
}

export interface ISrcDestPair<T> {
    src: ITable;
    dest: ITable;
    options: T;
}

export type OperationType = "insert" | "update" | "delete" | "replace" | "invalidate";

export interface IChange {
    _id: any;
    operationType: OperationType;
    clusterTime: string;
    ns: { db: string, coll: string };
    documentKey: any;
    fullDocument: any;
}

export interface ISqlStatement {
    sql: string;
    values: any[];
    subStatements?: ISqlStatement[];
    result?: Result;
}