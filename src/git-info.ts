import fs from "fs";
import getRepoInfo from "git-repo-info";
import { Logger } from "./loggers/logger";

const GIT_INFO_FILE = ".git-info.json";
let _repoInfo: getRepoInfo.GitRepoInfo;

/**
 * Get git repo info from .git-info.json by default.
 * If .git-info.json is not found, return getRepoInfo().
 * Fallback to getRepoInfo() if it fails to load .git-info.json.
 * Since "git-repo-info" relies on .git which cannot be found in
 * docker image, getRepoInfo() only return null in docker environment.
 * Copying .git into docker image is not a good practice neither.
 */
async function _getRepoInfo() {
    if (_repoInfo) {
        return _repoInfo;
    }
    if (!fs.existsSync(GIT_INFO_FILE)) {
        _repoInfo = getRepoInfo();
    } else {
        try {
            const data = fs.readFileSync(GIT_INFO_FILE, "utf8");
            _repoInfo = JSON.parse(data);
        } catch (err) {
            Logger.error(err);
            _repoInfo = getRepoInfo();
        }
    }
    return _repoInfo;
}

export async function getGitInfoString() {
    const { abbreviatedSha, committer, committerDate, author, commitMessage } = await _getRepoInfo();
    let outStr = "------------- Git Commit Info -------------\n";
    outStr += `sha: ${abbreviatedSha}\n`;
    outStr += `committer: ${committer}\n`;
    outStr += `committerDate: ${committerDate}\n`;
    outStr += `author: ${author}\n`;
    outStr += `commitMessage: ${commitMessage}\n`;
    outStr += "-------------------------------------------";
    return outStr;
}
