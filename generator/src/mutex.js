class Mutex {
    constructor() {
        this.queue = [];
        this.locked = false;
    }

    lock() {
        const unlock = () => {
            this.locked = false;
            if (this.queue.length > 0) {
                const nextUnlock = this.queue.shift();
                this.locked = true;
                nextUnlock(unlock);
            }
        };

        if (this.locked) {
            return new Promise(resolve => this.queue.push(resolve));
        } else {
            this.locked = true;
            return Promise.resolve(unlock);
        }
    }
}

module.exports = Mutex;