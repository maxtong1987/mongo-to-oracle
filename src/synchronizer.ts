import { MongoClient } from "mongodb";
import { IDbConnections } from "./connections/db-connections";
import { IChange, IOptionTable, ISqlStatement, ITable } from "./models";
import { Logger } from "./loggers/logger";
import { OracleExecuter } from "./oracle-executer";
import { SqlConstructor } from "./sql-constructor";
import { SrcObject } from "./src-object";
import { SyncPairs } from "./sync-pairs";

export interface ISyncOptions {
    isSyncOnStart: boolean;
    isSyncInRealTime: boolean;
}

export interface ISynchronizerConfig {
    db: string;
    "mongo->oracle": IOptionTable<ISyncOptions>[];
    defaultOptions: ISyncOptions;
}

/**
 * listen to mongo and synchronize changes from mongo to oracle
 */
export class Synchronizer extends OracleExecuter {
    private _config: ISynchronizerConfig;
    private _resumeTokens: any;
    private _mongo: MongoClient;

    constructor({ mongo, oracle }: IDbConnections, config: ISynchronizerConfig, resumeTokens: any) {
        super(oracle);
        this._mongo = mongo;
        this._config = config;
        this._resumeTokens = resumeTokens;
    }

    public async start(onChangeCallback: (change: IChange) => void) {
        const { db, "mongo->oracle": mongoToOracleTables, defaultOptions } = this._config;
        const syncPair = new SyncPairs(mongoToOracleTables, defaultOptions);
        // construct resumeTokens and syncPair
        await this.synOnStart(db, syncPair);
        await this.listen(db, syncPair, onChangeCallback);
    }

    public listen(dbName: string, syncPairs: SyncPairs, onChangeCallBack?: (change: IChange) => void) {
        Logger.info("Start listening to mongo changes...");
        const db = this._mongo.db(dbName);
        // create changeStreams according configs
        for (const pair of syncPairs) {
            const { src, dest, options } = pair;
            if (!options.isSyncInRealTime) {
                Logger.info(`Sync.listen: skip ${src.table}`);
                continue;
            }
            const resumeAfter = this._resumeTokens ? this._resumeTokens[src.table] : null;
            if (resumeAfter) {
                Logger.info(`resumeToken for ${src.table}: ${JSON.stringify(resumeAfter)}`);
            }
            const changeStream = db.collection(src.table)
                .watch(src.pipeline || [], { fullDocument: "updateLookup", resumeAfter });
            changeStream.on("change", async (change: IChange) => {
                await this.onChange(change, src, dest);
                if (onChangeCallBack) {
                    onChangeCallBack(change);
                }
            });
            changeStream.on("error", (err) => {
                Logger.error(err);
            });
        }
    }

    public async synOnStart(dbName: string, syncPairs: SyncPairs) {
        Logger.info("Batch sync begin...");
        const beginTime = Date.now();
        const db = this._mongo.db(dbName);
        const sqlStatements: ISqlStatement[] = [];
        for (const pair of syncPairs) {
            const { src, dest, options } = pair;
            if (!options.isSyncOnStart) {
                Logger.info(`Sync.synOnStart: skip ${src.table}`);
                continue;
            }
            const collection = await db.collection(src.table)
                .find(src.query || {}).toArray();
            for (const document of collection) {
                const sqlStatement = SqlConstructor.upsert({ src, dest, srcObject: new SrcObject(document) });
                sqlStatements.push(sqlStatement);
            }
        }
        await this.executeMany(sqlStatements, false);
        Logger.info(`Batch sync end (${Date.now() - beginTime} ms)`);
    }

    private async onChange(change: IChange, src: ITable, dest: ITable) {
        Logger.debug(`${JSON.stringify(change)}`);
        switch (change.operationType) {
            case "insert":
                await this.insert({ src, dest, srcObject: new SrcObject(change.fullDocument) });
                break;
            case "update":
                await this.update({ src, dest, srcObject: new SrcObject(change.fullDocument) });
                break;
            case "replace":
                await this.upsert({ src, dest, srcObject: new SrcObject(change.fullDocument) });
                break;
            case "delete":
                await this.delete({ src, dest, srcObject: new SrcObject(change.documentKey) });
                break;
            case "invalidate":
                Logger.warn(`the following collection is dropped: ${src.table}`);
                return;
            default:
                Logger.warn(`unknown operation: ${change.operationType}\n${JSON.stringify(change)}`);
                return;
        }
    }
}