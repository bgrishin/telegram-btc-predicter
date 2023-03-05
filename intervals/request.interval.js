import axios from "axios";

const requests = [];

const REQUEST_INTERVAL = 20000;

const processRequests = async () => {
  const lastRequest = requests.shift();
  if (!lastRequest) {
    setTimeout(processRequests, REQUEST_INTERVAL);
    return;
  }

  lastRequest.waiting = false;
  axios
    .get(lastRequest.url)
    .then((response) => lastRequest.resolve(response))
    .catch((error) => lastRequest.reject(error))
    .finally(() => setTimeout(processRequests, REQUEST_INTERVAL));
};

export const request = (url) => {
  const alreadyRequestedIndex = requests.findIndex(
    (request) => request.url === url
  );
  if (requests[alreadyRequestedIndex]?.waiting) {
    requests.splice(alreadyRequestedIndex, 1);
  }
  return new Promise((resolve, reject) =>
    requests.push({ url, resolve, reject, waiting: true })
  );
};

setTimeout(processRequests, REQUEST_INTERVAL);
