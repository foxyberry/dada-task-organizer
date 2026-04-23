
import http from "http";

async function getSA() {
  const options = {
    hostname: "metadata.google.internal",
    path: "/computeMetadata/v1/instance/service-accounts/default/email",
    headers: {
      "Metadata-Flavor": "Google",
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    });
    req.on("error", (e) => {
      reject(e);
    });
  });
}

getSA().then(console.log).catch(console.error);
