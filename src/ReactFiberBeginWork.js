import {
  IndeterminateComponent,
  FunctionComponent,
  HostComponent,
} from "./ReactWorkTags";
import { renderWithHooks } from "./ReactFiberHooks";

/**
 * 开始构建工作单元
 * @param {*} current 上一次的fiber,初次为null
 * @param {*} workInProgress  当前的fiber
 */
export function beginWork(current, workInProgress) {
  if (current) {
    // 有值，说明不是初次渲染 , 这里组件为函数组件

    switch (workInProgress.tag) {
      case FunctionComponent:
        return updateFunctionComponent(
          current,
          workInProgress,
          workInProgress.type
        );
      default:
        break;
    }
  } else {
    switch (workInProgress.tag) {
      case IndeterminateComponent:
        return mountIndeterminateComponent(
          current,
          workInProgress,
          workInProgress.type
        );
      default:
        break;
    }
  }
}

//更新
function updateFunctionComponent(current, workInProgress, Component) {
  //value即为函数组件的返回值，也就是jsx,虚拟dom
  const newValue = renderWithHooks(current, workInProgress, Component);

  // workInProgress.tag = FunctionComponent; 这里不需要修改tag

  // window.counter.props.children[2].props.onClick() 进入调试
  window.counter = newValue;
  console.log('newValue',newValue);

  //   根据儿子返回的虚拟dom，构建子fiber
  reconcileChildren(current, workInProgress, newValue);

  return null;
}

function mountIndeterminateComponent(current, workInProgress, Component) {
  //value即为函数组件的返回值，也就是jsx,虚拟dom
  const value = renderWithHooks(current, workInProgress, Component);

  workInProgress.tag = FunctionComponent;

  // window.counter.props.children[2].props.onClick() 进入调试
  window.counter = value;

  //   根据儿子返回的虚拟dom，构建子fiber
  reconcileChildren(current, workInProgress, value);

  //   return workInProgress.child;
  return null;
}

function reconcileChildren(current, workInProgress, children) {
  let childFiber = {
    tag: HostComponent,
    type: children.type,
  };

  workInProgress.child = childFiber;
}
