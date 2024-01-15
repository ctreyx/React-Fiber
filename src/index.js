import React from "react";
import ReactDOM from "react-dom";
import { IndeterminateComponent } from "./ReactWorkTags";
import { render } from "./ReactFiberWorkLoop";
import { useReducer, useState } from "./ReactFiberHooks";

const reducer = (state, action) => {
  if (action.type === "INCREMENT") {
    return state + 1;
  } else {
    return state;
  }
};

const App = () => {
  const [number, setNumber] = useReducer(reducer, 0);
  const [number2, setNumber2] = useState(0);
  console.log('render');
  return (
    <div>
      app
      {/* <h1>number:{number}</h1> */}
      <h1>number2:{number2}</h1>
      {/* <button onClick={() => setNumber({ type: "INCREMENT" })}>+</button> */}
      <button onClick={() => setNumber2(2)}>number2+</button>
    </div>
  );
};

// ReactDOM.render(<App />, document.getElementById("root"));

let workInProgress = {
  tag: IndeterminateComponent, //fiber类型,函数组件初次渲染时的类型，是一个不确定的类型
  type: App, //函数组件本身
  alternate: null, //双缓冲机制，用来在更新前后切换的
};

render(workInProgress);
