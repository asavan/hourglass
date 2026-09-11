import path from "path";
import { fileURLToPath } from "url";

import PACKAGE from "../package.json" with { type: "json" };
import {webpackProd} from "devdeps";

const prodConfig = () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    return webpackProd(PACKAGE.version, dirname);
};

export default prodConfig;
