import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

function Analytics() {
  const [usage, setUsage] = useState({});

  useEffect(() => {
    const logRef = ref(db, "logs");

    onValue(logRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setUsage({});
        return;
      }

      const usageMap = {};

      Object.keys(data).forEach((key) => {
        const log = data[key];

        if (!log?.item || !log?.weight) return;

        if (!usageMap[log.item]) {
          usageMap[log.item] = 0;
        }

        usageMap[log.item] += Number(log.weight);
      });

      setUsage(usageMap);
    });
  }, []);

  const mostUsed = Object.entries(usage)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ padding: "20px" }}>
      <h1>Analytics</h1>

      <h2>Total Usage</h2>

      {Object.entries(usage).map(([item, total], i) => (
        <p key={i}>
          {item}: {total} g
        </p>
      ))}

      <h2>🔥 Most Used</h2>

      {mostUsed && (
        <p>
          {mostUsed[0]} → {mostUsed[1]} g
        </p>
      )}
    </div>
  );
}

export default Analytics;