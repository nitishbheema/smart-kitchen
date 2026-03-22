import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

function Logs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const logRef = ref(db, "logs");

    onValue(logRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const list = Object.values(data);
      setLogs(list.reverse());
    });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Logs</h1>

      {logs.map((log, i) => (
        <div key={i} style={{
          border: "1px solid #ccc",
          padding: "10px",
          margin: "10px 0"
        }}>
          <p><b>Item:</b> {log.item}</p>
          <p><b>Weight:</b> {log.weight} g</p>
          <p><b>Status:</b> {log.status}</p>
          <p><b>User:</b> {log.user}</p>
          <p><b>Time:</b> {log.time}</p>
        </div>
      ))}
    </div>
  );
}

export default Logs;