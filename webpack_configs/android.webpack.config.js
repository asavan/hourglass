import path from "path";
import { fileURLToPath } from "url";

import {webpackAndroid} from "devdeps";

const aConfig = () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    return webpackAndroid(dirname);
};

export default aConfig;
