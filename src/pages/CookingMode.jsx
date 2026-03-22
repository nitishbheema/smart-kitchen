import { useEffect, useState } from "react";
import { listenWeight } from "../services/weightService";
import { listenRFID } from "../services/rfidService";
import { listenRecipes } from "../services/recipeService";
import { listenFlow } from "../services/flowService";
import { checkStatus } from "../utils/toleranceCheck";
import { addLog } from "../services/logService";

function CookingMode() {
  const [weight, setWeight] = useState(0);
  const [item, setItem] = useState("None");
  const [recipes, setRecipes] = useState({});
  const [flow, setFlow] = useState({});
  const [step, setStep] = useState(0);
  const [selectedDish, setSelectedDish] = useState("biryani");
  const [started, setStarted] = useState(false);
  const [logged, setLogged] = useState(false); // 🔥 important

  // 🔹 Firebase listeners
  useEffect(() => {
    listenWeight(setWeight);
    listenRFID(setItem);
    listenRecipes(setRecipes);
  }, []);

  useEffect(() => {
    if (started) {
      listenFlow(selectedDish, setFlow);
    }
  }, [started, selectedDish]);

  const expectedItem = flow[step];
  const target = recipes[expectedItem] || 0;

  const isCorrectItem =
    item?.toLowerCase() === expectedItem;

  const status = checkStatus(weight, target);
  const isError = !isCorrectItem || status !== "OK";

  // 🔥 AUTO LOG + STEP CONTROL (CORE FIX)
  useEffect(() => {
    if (started && !isError && expectedItem && target > 0 && !logged) {
      addLog({
        item,
        weight,
        target,
        status,
        step,
        dish: selectedDish,
      });

      setLogged(true);
      setStep((prev) => prev + 1);
    }

    if (isError) {
      setLogged(false);
    }
  }, [isError, started]);

  const totalSteps = Object.keys(flow).length || 1;
  const progress = Math.min((step / totalSteps) * 100, 100);

  const getBarColor = () => {
    if (!isCorrectItem) return "#ff4d4d";
    if (status === "UNDER") return "#ffa500";
    if (status === "OVER") return "#ff4d4d";
    return "#00c853";
  };

  const resetCooking = () => {
    setStep(0);
    setStarted(false);
    setLogged(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      color: "white",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Arial"
    }}>
      <div style={{
        width: "90%",
        maxWidth: "500px",
        background: "#1e293b",
        borderRadius: "20px",
        padding: "25px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}>
        <h1 style={{ textAlign: "center" }}>🍳 Smart Cooking</h1>

        {!started && (
          <>
            <h3>Select Dish</h3>
            <select
              value={selectedDish}
              onChange={(e) => setSelectedDish(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                marginBottom: "15px"
              }}
            >
              <option value="biryani">Biryani</option>
              <option value="friedrice">Fried Rice</option>
            </select>

            <button
              onClick={() => setStarted(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "#00c853",
                color: "white",
                fontWeight: "bold",
                border: "none"
              }}
            >
              ▶ Start Cooking
            </button>
          </>
        )}

        {started && (
          <>
            <h3 style={{ textAlign: "center" }}>
              {selectedDish.toUpperCase()}
            </h3>

            <h2 style={{ textAlign: "center" }}>
              Step {step + 1} / {totalSteps}
            </h2>

            <h1 style={{
              textAlign: "center",
              fontSize: "32px",
              margin: "10px 0"
            }}>
              {expectedItem?.toUpperCase()}
            </h1>

            <h3 style={{ textAlign: "center" }}>
              Target: {target} g
            </h3>

            <h1 style={{
              textAlign: "center",
              fontSize: "45px",
              margin: "10px 0"
            }}>
              {weight} g
            </h1>

            {/* Progress bar */}
            <div style={{
              width: "100%",
              height: "18px",
              background: "#334155",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "15px"
            }}>
              <div style={{
                width: target ? `${Math.min((weight / target) * 100, 100)}%` : "0%",
                height: "100%",
                background: getBarColor(),
                transition: "0.3s"
              }}></div>
            </div>

            <h3 style={{ textAlign: "center" }}>
              {isCorrectItem ? "✔ Correct Item" : "✖ Wrong Item"}
            </h3>

            <h3 style={{ textAlign: "center" }}>
              Status: {status}
            </h3>

            <h3 style={{ textAlign: "center" }}>
              Progress: {progress.toFixed(0)}%
            </h3>

            {isError ? (
              <h2 style={{ color: "#ff4d4d", textAlign: "center" }}>
                ⚠ Fix Input
              </h2>
            ) : (
              <h2 style={{ color: "#00c853", textAlign: "center" }}>
                ✔ Logged & Next Step
              </h2>
            )}

            <button
              onClick={resetCooking}
              style={{
                width: "100%",
                marginTop: "15px",
                padding: "10px",
                borderRadius: "10px",
                background: "#ff4d4d",
                color: "white",
                border: "none"
              }}
            >
              🔄 Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CookingMode;