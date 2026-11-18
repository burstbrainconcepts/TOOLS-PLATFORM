import { Config } from '@remotion/cli/config';
Config.setBrowserExecutable(process.env.CHROME_PATH ?? null);
Config.setChromiumOpenGlRenderer('swangle');
