import fetch from 'node-fetch';
import parseArgsStringToArgv from 'string-argv';
import { ActionInputs } from "./args";
import { Octokit } from 'octokit';
import { createActionAuth } from '@octokit/auth-action';

export type OutputType = "Json" | "Toml" | "Stdout" | "Xml" | "Html" | "Lcov";

export interface TarpaulinConfig {
    /**
     * Additional command line options.
     */
    additionalOptions: string[],

    /**
     * The URL to download a tarball of cargo-tarpaulin from.
     */
    downloadUrl: string,

    /**
     * The type of tests to run. If {@code null}, doctests and normal tests
     * will be run.
     */
    type: string | null,

    /**
     * The maximum time a test can be ran without response before a timeout occurs.
     */
    timeout: string | null,

    /**
     * Output format of coverage report
     */
    outType: OutputType,
}

/**
 * Resolve the configuration (e.g., download url and test options) required to run tarpaulin
 * from the inputs supplied to the action.
 *
 * @param input The parameters of the action.
 */
export default async function resolveConfig(input: ActionInputs): Promise<TarpaulinConfig> {
    const downloadUrl = await getDownloadUrl(input.requestedVersion);
    const type = input.runType ? input.runType : null;
    const timeout = input.timeout ? input.timeout : null;
    const outType = input.outType ? input.outType : "Xml";

    let additionalOptions: string[] = [];

    if (input.opts !== null) {
        additionalOptions = parseArgsStringToArgv(input.opts);
    }

    return {
        additionalOptions,
        downloadUrl,
        timeout,
        type,
        outType,
    };
}

/**
 * Determine the download URL for the tarball containing the `cargo-tarpaulin` binaries.
 *
 * @param requestedVersion The Git tag of the tarpaulin revision to get a download URL for. May be any valid Git tag,
 * or a special-cased `latest`.
 */
async function getDownloadUrl(requestedVersion: string): Promise<string> {
    const auth = createActionAuth();
    const creds = await auth();
    const client = new Octokit({ auth: creds.token });

    var url: string | null;

    if (requestedVersion == "latest") {
        let response = await client.rest.repos.getLatestRelease({
            owner: 'xd009642',
            repo: 'tarpaulin',
        });
        url = response.data.tarball_url;
    } else {
        let response = await client.rest.repos.getReleaseByTag({
            owner: 'xd009642',
            repo: 'tarpaulin',
            tag: requestedVersion,
        });
        url = response.data.tarball_url;
    }

    if (url == null) {
        throw new Error(`Unable to find tarpaulin release tarball for version ${requestedVersion}`);
    }

    return url;
}
