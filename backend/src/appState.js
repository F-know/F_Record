const state = {
    // initialized in initAppState()
    configService: null,
    db: null,
    runtime: null,
    generatorInstance: null,
    logger: null,
    logService: null,
    timelapseService: null,
};

function setAppState(patch) {
    if (!patch) return;
    Object.keys(patch).forEach((key) => {
        state[key] = patch[key];
    });
}

exports.state = state;
exports.setAppState = setAppState;

