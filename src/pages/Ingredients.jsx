import { useState } from "react";

function Ingredients() {
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");

  const addIngredient = () => {
    console.log(name, limit);
  };

  return (
    <div>
      <h1>Ingredients</h1>

      <input placeholder="Name" onChange={(e)=>setName(e.target.value)} />
      <input placeholder="Limit (g)" onChange={(e)=>setLimit(e.target.value)} />

      <button onClick={addIngredient}>Add</button>
    </div>
  );
}

export default Ingredients;