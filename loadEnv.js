
/**
 * Responsible of loading the environment variables  
 */

import path from 'path'
import dotenv from 'dotenv';
dotenv.config()

// Read botFilePath and botFileSecret from .env file.
const ENV_FILE = path.join(path.resolve(), '.env');
dotenv.config({ path: ENV_FILE });
