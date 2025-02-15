import fetch from "node-fetch";
import parseArgsStringToArgv from "string-argv";
import { ActionInputs } from "./args";

export type OutputType = "Json" | "Toml" | "Stdout" | "Xml" | "Html" | "Lcov";

export interface TarpaulinConfig {
    /**
     * Additional command line options.
     */
    additionalOptions: string[];

    /**
     * The URL to download a tarball of cargo-tarpaulin from.
     */
    downloadUrl: string;

    /**
     * The type of tests to run. If {@code null}, doctests and normal tests
     * will be run.
     */
    type: string | null;

    /**
     * The maximum time a test can be ran without response before a timeout occurs.
     */
    timeout: string | null;

    /**
     * Output format of coverage report
     */
    outType: OutputType;
}

/**
 * Resolve the configuration (e.g., download url and test options) required to run tarpaulin
 * from the inputs supplied to the action.
 *
 * @param input The parameters of the action.
 */
export default async function resolveConfig(
    input: ActionInputs,
): Promise<TarpaulinConfig> {
    let releaseEndpoint =
        "https://api.github.com/repos/xd009642/tarpaulin/releases";
    if (process.env.GITHUB_RELEASE_ENDPOINT) {
        releaseEndpoint = process.env.GITHUB_RELEASE_ENDPOINT;
    }

    const downloadUrl = await getDownloadUrl(
        releaseEndpoint,
        input.requestedVersion,
    );
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
async function getDownloadUrl(
    releaseEndpoint: string,
    requestedVersion: string,
): Promise<string> {
    const releaseInfoUri =
        requestedVersion === "latest"
            ? `${releaseEndpoint}/latest`
            : `${releaseEndpoint}/tags/${requestedVersion}`;

    const releaseInfoRequest = await fetch(releaseInfoUri);
    const releaseInfo = await releaseInfoRequest.json();
    const asset = releaseInfo["assets"].find((asset) => {
        return (
            asset["content_type"] === "application/x-gtar" &&
            asset["browser_download_url"].includes("x86_64-unknown-linux-gnu")
        );
    });

    if (!asset) {
        throw new Error(
            `Couldn't find a tarpaulin release tarball containing binaries for ${requestedVersion}`,
        );
    }

    return asset["browser_download_url"];
}
