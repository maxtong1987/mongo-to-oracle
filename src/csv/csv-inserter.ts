import csv from "csv-parser";
import fs from "fs";
import { CsvPairs } from "./csv-pairs";
import { ISqlStatement, ISrcDestPair, IOptionTable } from "../models";
import { Logger } from "../loggers/logger";
import { OracleExecuter } from "../oracle-executer";
import { SqlConstructor } from "../sql-constructor";
import { SrcObject } from "../src-object";
import { Connection } from "oracledb";

export interface ICsvOptions extends csv.Options {
    isCleanUpBeforeSync: boolean;
}

export interface ICsvInserterConfig {
    "csv->oracle": Array<IOptionTable<ICsvOptions>>;
    path: string;
    defaultOptions: ICsvOptions;
}

/**
 * listen to mongo and synchronize changes from mongo to oracle
 */
export class CsvInserter extends OracleExecuter {
    private _config: ICsvInserterConfig;

    constructor(oracle: Connection, config: ICsvInserterConfig) {
        super(oracle);
        this._config = config;
    }

    public async insertCsv(pair: ISrcDestPair<ICsvOptions>) {
        const { path } = this._config;
        const { src, dest, options } = pair;
        const sqlStatements: ISqlStatement[] = [];
        const filePath = `${path}/${src.table}`;
        if (!fs.existsSync(filePath)) {
            Logger.warn(`File not exist: ${filePath}`);
            return;
        }
        if (options.isCleanUpBeforeSync) {
            Logger.info(`${src.table}->${dest.table}: begin delete ${dest.table} ...`);
            await this.deleteAll({ src, dest, srcObject: new SrcObject(null) });
        }
        fs.createReadStream(filePath, { encoding: "utf8" })
            .pipe(csv(options))
            .on("data", async (data) => {
                const sqlStatement = SqlConstructor.upsert({ src, dest, srcObject: new SrcObject(data) });
                sqlStatements.push(sqlStatement);
            })
            .on("end", async () => {
                Logger.info(`${src.table}->${dest.table}: begin insert...\n`);
                const result = await this.executeMany(sqlStatements);
                Logger.info(`${src.table}->${dest.table}: ${result.rowsAffected} rowsAffected`);
            });
    }

    public async start() {
        Logger.info("CsvInserter start...");
        const { "csv->oracle": tables, defaultOptions, path } = this._config;
        const csvPairs = new CsvPairs(tables, defaultOptions);
        for (const pair of csvPairs) {
            try {
                this.insertCsv(pair);
            } catch (err) {
                Logger.error(err);
            }
        }
    }
}
