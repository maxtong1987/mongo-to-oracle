import { MongoClientOptions } from "mongodb";
import { ConnectionAttributes } from "oracledb";
import { ILogConfig } from "../loggers/logger";
import { ISynchronizerConfig } from "../synchronizer";
import { ICsvInserterConfig } from "../csv/csv-inserter";

export interface IMongoConfig {
    url: string;
    options: MongoClientOptions;
}

export interface IConfig {
    mongo: IMongoConfig;
    oracle: ConnectionAttributes;
    log: ILogConfig;
    synchronizer?: ISynchronizerConfig;
    csvInserter?: ICsvInserterConfig;
}


export const defaultConfig: IConfig = {
    oracle: {
        connectString: "localhost:1521/ORCLPDB1",
        password: "m2o",
        user: "m2o"
    },
    mongo: {
        url: "mongodb://localhost:27017/?readPreference=secondary",
        options: {
            useNewUrlParser: true
        }
    },
    log: {
        level: "debug",
        files: [
            {
                filename: "mongo-to-oracle-%DATE%.log",
                datePattern: "YYYY-MM-DD",
                maxSize: "100m",
                maxFiles: "3m"
            },
            {
                filename: "mongo-to-oracle-%DATE%.attention.log",
                datePattern: "YYYY-MM-DD",
                maxSize: "100m",
                maxFiles: "3m",
                level: "warn"
            }
        ]
    },
    synchronizer: {
        db: "mydb",
        defaultOptions: {
            isSyncOnStart: true,
            isSyncInRealTime: true
        },
        "mongo->oracle": [
            {
                table: "user->USER",
                keys: [
                    "_id->USER_ID"
                ],
                columns: [
                    "name->NAME",
                    "'type'->TYPE",
                    "'0'->VERSION"
                ]
            }
        ]
    }
}