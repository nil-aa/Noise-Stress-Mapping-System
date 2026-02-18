import React from "react";
import Navbar from "./components/Navbar";
import Map from "./components/Map";

function App() {
  return (
    <>
      <Navbar />
      <div style={{padding:"20px",display:"flex",justifyContent:"center",alignItems:"center",height:"100vh", flexDirection:"column"}}>
        <Map />
        {/* <h2 className="home_text">Are your neighbours too noisy?</h2> */}
        {/* <h2 id="home_text">Help us map stress points</h2> */}
      <button style = {{borderRadius:"15px", backgroundColor:"black", margin:"20px",}}>Check Noise Levels</button>
      </div>
    </>
  );
}

export default App;
