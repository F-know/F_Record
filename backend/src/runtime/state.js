function createRuntimeState() {
    return {
        currentDocumentId: null,
        currentDocumentUid: null,
        isGettingAndSavingImage: false,
        pendingTimeSpentSecondsByUid: {},
        lastSavedImageTimeMsByUid: {},
        timelapseExport: {
            jobsById: {},
            jobOrder: [],
            queue: [],
            runningJobId: null,
            nextJobSeq: 1,
        },
    };
}

exports.createRuntimeState = createRuntimeState;

