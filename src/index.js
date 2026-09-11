import game from "./js/main.js";

game(window, document);
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", {scope: "./"});
}
