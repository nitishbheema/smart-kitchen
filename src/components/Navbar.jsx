import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase/firebaseConfig";

const auth = getAuth(app);

function Navbar() {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/auth");
  };

  return (
    <div style={{ padding: "10px", background: "#ddd" }}>
      <button onClick={() => navigate("/")}>Dashboard</button>
      <button onClick={() => navigate("/cook")}>Cook</button>
      <button onClick={() => navigate("/ingredients")}>Ingredients</button>
      <button onClick={() => navigate("/logs")}>Logs</button>

      <button onClick={logout} style={{ float: "right" }}>
        Logout
      </button>
    </div>
  );
}

export default Navbar;