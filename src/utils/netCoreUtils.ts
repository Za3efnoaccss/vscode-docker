/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { SemVer } from 'semver';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { CommandLineBuilder } from './commandLineBuilder';
import { getTempFileName } from './osUtils';
import { execAsync } from './spawnAsync';

export async function getNetCoreProjectInfo(target: 'GetBlazorManifestLocations' | 'GetProjectProperties', project: string): Promise<string[]> {
    const targetsFile = path.join(ext.context.asAbsolutePath('resources'), 'netCore', `${target}.targets`);
    const outputFile = getTempFileName();

    const command = CommandLineBuilder
        .create('dotnet', 'build', '/r:false')
        .withArg(`/t:${target}`)
        .withArg(`/p:CustomAfterMicrosoftCommonTargets="${targetsFile}"`)
        .withArg(`/p:CustomAfterMicrosoftCommonCrossTargetingTargets="${targetsFile}"`)
        .withArg(`/p:InfoOutputPath="${outputFile}"`)
        .withQuotedArg(project);

    try {
        await execAsync(command, { timeout: 10000 });

        if (await fse.pathExists(outputFile)) {
            const contents = await fse.readFile(outputFile, 'utf-8');

            if (contents) {
                return contents.split(/\r?\n/ig);
            }
        }

        throw new Error(localize('vscode-docker.netCoreUtils.noProjectInfo', 'Unable to determine project information for target \'{0}\' on project \'{1}\'', target, project));
    } finally {
        if (await fse.pathExists(outputFile)) {
            await fse.unlink(outputFile);
        }
    }
}

let dotNetVersion: SemVer | undefined;
export async function getDotNetVersion(): Promise<SemVer> {
    if (!dotNetVersion) {
        const { stdout } = await execAsync(CommandLineBuilder.create('dotnet', '--version'));
        dotNetVersion = new SemVer(stdout);
    }

    return dotNetVersion;
}
