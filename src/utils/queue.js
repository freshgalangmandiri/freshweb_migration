class Queue {
  /**
   * Constructs a Queue with a specified size.
   *
   * @param {number} size - The maximum number of concurrent processes the queue can handle.
   * @property {Array} data - An array to store data to be processed.
   * @property {number} roomSize - The capacity of the queue.
   * @property {Array} queue - A multi-dimensional array to manage queued items.
   * @property {Array} queueIndex - An array to track the current index of each sub-queue.
   * @property {Array} temp - A temporary storage for queue data.
   * @property {Function|null} callback - A function to be executed on each queue item.
   * @property {boolean} callbackIsPromise - Indicates if the callback function is a promise.
   */
  constructor(size) {
    this.data = [];
    this.roomSize = size;

    this.queue = Array(this.roomSize).fill([]);
    this.queueIndex = this.queue.map((_) => 0); // for current index
    this.temp = this.queue;
    this.callback = null;
    this.callbackIsPromise = false;
    this.completed = 0;
    this.completedCallback = null;
  }

  setData(data = []) {
    this.data = data;
    const tempData = Array.from(this.data);

    let indexAt = 0;
    while (tempData.length !== 0) {
      if (indexAt === this.temp.length) indexAt = 0;
      if (!tempData.length) break;

      this.#setTemp(indexAt, tempData.splice(0, 1)[0]);
      indexAt++;
    }

    this.queue = this.queue.map((item, index) => this.temp[index][0]);
    return this;
  }

  // set temp, btw temp is multidimensional array
  #setTemp(index, data) {
    this.temp = this.temp.map((item, i) =>
      i === index ? [...item, data] : item
    );
  }

  setCompleted() {
    this.completed += 1;

    console.log({
      comp: this.completed,
      length: this.data.length,
      typeof: typeof this.completedCallback,
    });

    if (this.completedCallback && this.completed === this.data.length)
      this.completedCallback({ status: true, completed: this.completed });
  }

  /**
   * Checks if the given callback is an asynchronous function.
   *
   * @param {Function} callback - The function to check.
   * @returns {boolean} - Returns true if the callback is an async function, otherwise false.
   */
  isPromise(callback) {
    if (!callback) return false;
    return callback.constructor.name === "AsyncFunction";
  }

  // execute callback for process item of temp every queue is finished
  #executeOn(queueIndex, itemIndex) {
    const data = this.temp?.[queueIndex]?.[itemIndex];
    if (!data) return;

    let result = undefined;
    this.queueIndex[queueIndex] += 1;
    const nextData = this.temp[queueIndex]?.[this.queueIndex[queueIndex]];

    if (this.callbackIsPromise) {
      return this.callback(data, this.data).then((response) => {
        if (response) {
          this.setCompleted();
          this.#executeOn(queueIndex, this.queueIndex[queueIndex]);
        }
      });
    } else result = this.callback(data, this.data);

    this.setCompleted();
    if (nextData) {
      this.#executeOn(queueIndex, this.queueIndex[queueIndex]);
    }
  }

  setCallback(callback, completedCallback) {
    if (!callback) return;
    if (typeof callback !== "function")
      throw { error: "callback is not a function" };
    if (!!completedCallback && typeof completedCallback !== "function")
      throw { error: "completedCallback is not a function" };

    this.completedCallback = completedCallback;
    this.callback = callback;
    this.callbackIsPromise = this.isPromise(this.callback);
  }

  execute(callback = null, completedCallback = null) {
    if (!this.callback) {
      this.setCallback(callback, completedCallback);
    }

    this.queue.map((item, index) => {
      const data = item;
      const nextIndex = ++this.queueIndex[index];
      let result = undefined;

      if (this.callbackIsPromise)
        return this.callback(data, this.data).then((response) => {
          if (response) {
            this.setCompleted();
            this.#executeOn(index, nextIndex);
          }
        });
      else result = this.callback(data, this.data);

      this.setCompleted();
      if (result) this.#executeOn(index, nextIndex);
    });
  }
}

module.exports = { Queue };
