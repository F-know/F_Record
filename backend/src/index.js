(function () {
    "use strict";

    const { startHttpServer } = require("./httpServer");
    const { createImageChangedListener } = require("./generator/imageChangedListener");
    const { updateCurrentDocument, updateCurrentDocumentTimeSpent } = require("./loop");
    const logger = require("./logger");
    const { createConfigService } = require("./config/service");
    const { loadEnv } = require("./loadEnv");
    const { createRuntimeState } = require("./runtime/state");
    const { setAppState } = require("./appState");
    const { initDb } = require("./db");
    const { createLogService } = require("./log/service");
    const { createTimelapseService } = require("./timelapse/service");

    function init(generator, config) {
        loadEnv();
        logger.registerProcessErrorHandlers();

        // 先把最基础的全局依赖放进去，后续 create* 里可以直接用 state.logger
        setAppState({ logger, generatorInstance: generator });

        const logService = createLogService();
        setAppState({ logService });

        const configService = createConfigService();
        setAppState({ configService });

        const runtime = createRuntimeState();
        setAppState({ runtime });

        const timelapseService = createTimelapseService();
        setAppState({ timelapseService });

        const db = initDb();
        setAppState({ db });

        const imageChangedListener = createImageChangedListener();
        generator.addPhotoshopEventListener("imageChanged", imageChangedListener);

        updateCurrentDocument();

        updateCurrentDocumentTimeSpent();

        startHttpServer();
    }

    exports.init = init;
}())
