// 通过工作单元fiber来构建dom
let nextUnitOfwork = null;
let wipRoot = null; //根组件
let currentRoot = null; //上一个根组件
let deletions = [];
let wipFiber = null; //上一个函数组件
let hooksIndex = 0;

function workLoop(deadline) {
  let shouldYield = true;
  while (nextUnitOfwork && shouldYield) {
    nextUnitOfwork = performUnitOfWork(nextUnitOfwork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  // 如果没有下个任务并且存在根组件，一次性渲染到根组件
  if (!nextUnitOfwork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop); 
}
requestIdleCallback(workLoop); //获取浏览器空闲时间

// 渲染根组件
function commitRoot() {
  //该步已经渲染全部dom，拿到wipRoot的儿子去一次性渲染
  commitWork(wipRoot.child);
  deletions.forEach(commitWork); //将删除的丢进去
  currentRoot = wipRoot;
  wipRoot = null;
}

// 拿到根节点的子节点开始网上挂载
function commitWork(fiber) {
  if (!fiber) return;

  // 拿到他的父级,但函数组件没有dom，所以继续找上级
  let parentFiber = fiber.parent;
  while (!parentFiber.dom) {
    parentFiber = parentFiber.parent;
  }
  const domParent = parentFiber.dom;

  // 通过这一步一次性挂，而不是之前那样一次次挂
  // fiber.dom && domParent.appendChild(fiber.dom);
  // 根据当前子节点的tag判断类型

  switch (fiber.effectTag) {
    // 新增
    case 'PLACEMENT':
      !!fiber.dom && domParent.appendChild(fiber.dom);
      break;
    // 删除
    case 'DELETION':
      !!fiber.dom && domParent.removeChild(fiber.dom);
      // commitDeletions(fiber, domParent);
      break;
    // 更新
    case 'UPDATE':
      !!fiber.dom && updateDom(fiber.dom, fiber.alternate, fiber.props);
      break;
  }

  // 执行下一级
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
// 筛选出事件
const isEvent = key => key.startsWith('on');
// 筛选出props
const isProperty = key => !isEvent(key) && key !== 'children';
// 筛选出要移除的属性
const isGone = (pre, next) => key => !next[key];
// 筛选出新的属性
const isNew = (pre, next) => key => pre[key] !== next[key];
// 这里添加props
function updateDom(dom, oldVnode, newVnode) {
  // 1.移除旧的属性
  Object.keys(oldVnode)
    .filter(isProperty)
    .filter(isGone(oldVnode, newVnode))
    .forEach(name => (dom[name] = ''));
  // 2.移除旧的方法
  Object.keys(oldVnode)
    .filter(isEvent)
    .filter(
      key => isGone(oldVnode, newVnode)(key) || isNew(oldVnode, newVnode)(key)
    )
    .forEach(name => {
      const EventType = name.toLowerCase().substring(2);
      dom.removeEventListener(EventType, oldVnode[name]);
    });

  // 3.新增的属性
  Object.keys(newVnode)
    .filter(isProperty)
    .filter(isNew(oldVnode, newVnode))
    .forEach(name => {
      if (name === 'style') {
        for (const styleName in newVnode[name]) {
          dom.style[styleName] = newVnode[name][styleName];
        }
      } else {
        dom[name] = newVnode[name];
      }
    });

  // 4新增方法
  Object.keys(newVnode)
    .filter(isEvent)
    .filter(isNew(oldVnode, newVnode))
    .forEach(name => {
      const EventType = name.toLowerCase().substring(2);
      dom.addEventListener(EventType, newVnode[name]);
    });
}

function reconcileChildren(fatherFiber, elements) {
  // 拿到父级的上次子节点进行diff
  let oldFiber = fatherFiber.alternate ? fatherFiber.alternate.child : null;
  let index = 0;
  // 上面的都没有解析children,下面开始解析
  let preSibling = null;

  // 判断老的长度用完与儿子也要用完，避免漏掉
  while (index < elements.length || oldFiber !== null) {
    let newFiber = null;
    const childElement = elements[index];
    // 对比每个儿子，如果type不同直接覆盖
    const sameType = oldFiber && oldFiber.type === childElement.type;

    // 如果一样
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: childElement.props,
        dom: oldFiber.dom,
        parent: fatherFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    // 如果不一样
    if (!sameType && childElement) {
      newFiber = {
        type: childElement.type,
        props: childElement.props,
        dom: null,
        parent: fatherFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }
    // 如果不一样且老的在
    if (!sameType && oldFiber) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    oldFiber = oldFiber ? oldFiber.sibling : null;
    if (index === 0) {
      fatherFiber.child = newFiber;
    } else {
      preSibling.sibling = newFiber;
    }
    preSibling = newFiber;
    index++;
  }
}

function updateHostComponent(fiber) {
  const { children } = fiber.props;
  //fiber是根节点时有，后面的都没有.
  if (!fiber.dom) {
    fiber.dom = createDom(fiber, children);
  }
  // diff阶段
  reconcileChildren(fiber, children);
}

// 更新函数组件
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  wipFiber.hooks = []; //初始化hooks
  hooksIndex = 0;
  // 前三部全是初始化为了保存hooks
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
//fiber相当于Vnode,只不过将children循环渲染解析成单元格
function performUnitOfWork(fiber) {
  const { type } = fiber;

  // 这里判断是否是函数组件
  const isFunctionComponent = typeof type === 'function';

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 深度优先，然后同级，最后父级
  if (fiber.child) {
    return fiber.child; //深度优先
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling; //然后同级
    }
    nextFiber = nextFiber.parent; //最后父级
  }
}

function createDom(vnode, container) {
  const { type, props } = vnode;

  // type
  const dom =
    type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(type);

  // props交给updateDom,同时进行diff
  updateDom(dom, {}, props);

  // children交给performUnitOfWork

  return dom;
}

export function useState(initialState) {
  // 1.拿到上次fiber,查看上面是否有hooks,wipFiber是函数组件，只在第一次更新时进入
  const oldHooks = wipFiber?.alternate?.hooks?.[hooksIndex];
  const hook = {
    state: oldHooks ? oldHooks.state : initialState,
    queue: [],
  };

  // 通过queue把更新的状态放到队列中
  const actions = oldHooks ? oldHooks.queue : [];
  actions.forEach(v => (hook.state = v));

  const setState = action => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom, //第一次渲染
      props: currentRoot.props,
      alternate: currentRoot, //每次进来都可以取到上一次的根组件
    };
    deletions = [];
    nextUnitOfwork = wipRoot;
  };

  // 将最新hooks放到fiber中
  wipFiber.hooks.push(hook);
  hooksIndex++;
  return [hook.state, setState];
}

export function render(element, container) {
  wipRoot = {
    dom: container, //第一次渲染
    props: {
      children: [element],
    },
    alternate: currentRoot, //每次进来都可以取到上一次的根组件
  };
  deletions = [];
  nextUnitOfwork = wipRoot;
}
