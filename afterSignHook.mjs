import fs from 'fs';
import path from 'path';
import { notarize } from '@electron/notarize';

export default async function notarizeApp(params) {
    // Only notarize the app on macOS.
    if (process.platform !== 'darwin') {
        return;
    }
    
    console.log('afterSign hook triggered', params);

    const appId = 'org.kryptokrona.hugin';
    
    const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await notarize({
            appBundleId: appId,
            appPath,
            appleId: process.env.appleId,             // Apple Developer ID
            appleIdPassword: process.env.appleIdPassword, // App-specific password
            teamId: process.env.teamId,               // Team ID
        });
    } catch (error) {
        console.error('Notarization failed:', error);
    }

    console.log(`Done notarizing ${appId}`);
}
