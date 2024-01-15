import { beginWork } from "./ReactFiberBeginWork";

let workInProgress = null;
export function render(fiber) {
  workInProgress = fiber;
  workLoop();
}

//处理工作单元，返回下一个工作单元
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate; //获取当前fiber的替身进行更新
  return beginWork(current, unitOfWork);
}

function workLoop() {
  //看看有没有任务
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}



/**
 * 这里简化，源码是从根节点开始调度更新 --》 再一集一集往下调度更新
 * @param {*} fiber 
 */
export function scheduleUpdateOnFiber(fiber) {


  //1.创建新fiber
  let newFiber={
    ...fiber,
    alternate:fiber //替身
  }

  workInProgress=newFiber

  //2.调度更新
  workLoop()


}