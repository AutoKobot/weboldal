
import 'dotenv/config';
import { EnhancedModuleGenerator } from "../server/enhanced-module-generator";

async function main() {
    console.log("Imports efficient.");
    try {
        const generator = new EnhancedModuleGenerator();
        console.log("Generator created.");
    } catch (e) {
        console.error(e);
    }
}

main();
