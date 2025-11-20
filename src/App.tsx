import { useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

function App() {
  const [fingerprint, setFingerprint] = useState({
    visitorId: "",
    score: "",
  });

  const getFingerprint = async () => {
    const t0 = performance.now();
    const fp = await FingerprintJS.load();
    const t1 = performance.now();
    console.log(`FingerprintJS.load() duration: ${t1 - t0} milliseconds`);

    const result = await fp.get();

    setFingerprint(() => {
      return {
        visitorId: result.visitorId,
        score: String(result.confidence.score),
      };
    });
  };

  return (
    <>
      <h1>Fingerprint</h1>
      <button onClick={() => getFingerprint()}>Get browser fingerpint</button>
      <div className="card">
        {fingerprint.visitorId !== "" && (
          <>
            <h3>visitorId: {fingerprint.visitorId}</h3>
            <h3>confidence: {fingerprint.score}</h3>
          </>
        )}
      </div>
    </>
  );
}

export default App;
