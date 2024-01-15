import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

let ReactCurrentDispatcher = {
  current: null,
};
let workInProgressHook = null; //当前正在工作的hook
let currentHook = null; //老节点身上hook
let currentlyRenderingFiber = null; //当前正在渲染的fiber

//挂载阶段
const HookDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
};
//更新阶段
const HookDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
};

//实际上我们使用的useReducer,只是将参数传递给了 mountReducer
export function useReducer(reducer, initialState) {
  const dispatcher = ReactCurrentDispatcher.current;
  return dispatcher.useReducer(reducer, initialState);
}

//useState的实现
export function useState(initialState) {
  const dispatcher = ReactCurrentDispatcher.current;
  return dispatcher.useState(initialState);
}

//不同阶段，userReducer不同的处理函数
export function renderWithHooks(current, workInProgress, Component) {
  //将当前正在渲染的fiber赋值给currentlyRenderingFiber
  currentlyRenderingFiber = workInProgress;
  currentlyRenderingFiber.memoizedState = null; //初始化memoizedState

  if (current !== null) {
    // 更新阶段
    ReactCurrentDispatcher.current = HookDispatcherOnUpdate;
  } else {
    // 初次渲染
    ReactCurrentDispatcher.current = HookDispatcherOnMount;
  }

  const children = Component();

  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  return children;
}

function updateReducer(reducer, initialState) {
  //获取当前对象的老hook
  let hook = updateWorkInProgressHook();

  const queue = hook.queue; //获取老的queue
  let lastRenderedReducer = queue.memoizedState; //获取老的reducer方法

  let current = currentHook;

  const pengdingQueue = queue.pending; //获取更新链表

  if (pengdingQueue !== null) {
    let first = pengdingQueue.next; //next指向第一个update
    let newState = current.memoizedState; //获取老状态
    let update = first;
    do {
      const action = update.action;
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== null && update !== first);

    queue.pending = null; //清空更新队列

    hook.memoizedState = newState; //更新hook的状态
    queue.lastRenderedState = newState; //更新queue的状态
  }

  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}

function updateState(initialState) {
  return updateReducer(basicStateReducer, initialState);
}

function basicStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}

//这是基于老的节点，构建新的hook -->  currentHook代表老的hook,根据老的hook构建新的hook
function updateWorkInProgressHook() {
  let nextCurrentHook;
  if (currentHook === null) {
    //第一个hook, 获取老节点身上的hook
    const current = currentlyRenderingFiber.alternate; //获取老节点
    nextCurrentHook = current.memoizedState; //获取老节点的第一个hook
  } else {
    nextCurrentHook = currentHook.next;
  }

  currentHook = nextCurrentHook;

  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  };

  //   判断是不是第一个hook
  if (workInProgressHook === null) {
    //第一个hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    //不是第一个hook
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}

/**
 *
 * @param {*} reducer  reducer函数
 * @param {*} initialState  初始值
 */
function mountReducer(reducer, initialState) {
  //构建hooks单向链表
  let hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;

  const queue = (hook.queue = { pending: null }); //初始化更新队列
  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}

// useState是基于useReducer实现的
function mountState(initialState) {
  //获取当前对象的hook
  let hook = mountWorkInProgressHook();
  hook.memoizedState = initialState; //初始化hook的状态
  const queue = (hook.queue = {
    pending: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  }); //初始化queue

  const dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}

// 派发方法
function dispatchAction(fiber, queue, action) {
  debugger;
  const update = { action, next: null };
  const pending = queue.pending; //更新队列中的最后一个update
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next; //永远将最后一个update的next指向第一个update，构成一个环状链表
    pending.next = update;
  }
  queue.pending = update; // pending永远指向最后一个update

  const lastRenderedReducer = queue.lastRenderedReducer; //获取上一次渲染的reducer
  const lastRenderedState = queue.lastRenderedState; //获取上一次渲染的state

  update.lastRenderedReducer = lastRenderedReducer; //将上一次渲染的reducer挂载到update上
  update.lastRenderedState = lastRenderedState; //将上一次渲染的state挂载到update上

  const eagerReducer = lastRenderedReducer(lastRenderedState, action); //执行reducer

  //如果新状态和老状态相同，不需要更新
  if (Object.is(eagerReducer, lastRenderedState)) {
    return;
  }

  scheduleUpdateOnFiber(fiber);
}

function mountWorkInProgressHook() {
  let hook = {
    memoizedState: null, //自己状态
    queue: null, // 自己的更新队列
    next: null, //下一个hook
  };

  if (workInProgressHook === null) {
    //第一个hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    //不是第一个hook
    workInProgressHook = workInProgressHook.next = hook;
  }

  return workInProgressHook;
}
