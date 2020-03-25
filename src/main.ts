import fs from "fs";
import dotenv from "dotenv";
import { CsvInserter } from "./csv/csv-inserter.js";
import { getGitInfoString } from "./git-info";
import { IChange } from "./models";
import { Logger } from "./loggers/logger";
import { Mongo } from "./mongo";
import { Oracle } from "./oracle";
import { Synchronizer, ISynchronizerConfig } from "./synchronizer";
import { IDbConnections } from "./connections/db-connections";
import { IConfig, defaultConfig } from "./configs/config.js";

dotenv.config();

const LOG_PATH = process.env.LOG_PATH;
const CONFIG_FILE = process.env.CONFIG_FILE;
const RESUME_TOKEN_FILE = process.env.RESUME_TOKEN_FILE;

async function main(): Promise<void> {

    // get config from CONFIG_FILE
    let config: IConfig;
    try {
        config = (CONFIG_FILE) ? await import(CONFIG_FILE) : defaultConfig;
    } catch (err) {
        Logger.error(err);
        return;
    }

    // init Log class
    if (config.log !== undefined) {
        Logger.init(config.log, LOG_PATH);
    }
    Logger.info(`\nDate: ${new Date().toISOString()}`);

    // print git info
    const gitPrintStr = await getGitInfoString();
    Logger.info(gitPrintStr);

    // connect to oracledb and mongodb
    const { url, options } = config.mongo;
    const connections: IDbConnections = {
        mongo: await new Mongo(url, options).connect(),
        oracle: await new Oracle(config.oracle).connect(),
    };
    Logger.info("All databases are connected.");

    const {
        csvInserter: csvInserterConfig,
        synchronizer: synchronizerConfig,
    } = config;
    if (csvInserterConfig) {
        await new CsvInserter(connections.oracle, csvInserterConfig).start();
    }
    if (synchronizerConfig) {
        await startSynchronizer(connections, synchronizerConfig);
    }
}

main().catch((err) => {
    Logger.error(err);
    process.exit();
});

async function startSynchronizer(connections: IDbConnections, config: ISynchronizerConfig) {
    const resumeTokens = getResumeTokens();

    const onChangeCallback = (change: IChange) => {
        resumeTokens[change.ns.coll] = change._id;
        if (!RESUME_TOKEN_FILE) {
            return;
        }
        return fs.writeFile(RESUME_TOKEN_FILE, JSON.stringify(resumeTokens), (err) => {
            if (err) {
                Logger.error(err);
            }
        });
    };

    return new Synchronizer(connections, config, resumeTokens).start(onChangeCallback);
}

function getResumeTokens() {
    if (!RESUME_TOKEN_FILE) { return {}; }
    try {
        const data = fs.readFileSync(RESUME_TOKEN_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        Logger.warn(err);
        return {};
    }
}
