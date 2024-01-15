


# fiber,即一个虚拟dom,为了方便暂停，分成一个个fiber.

容器有两棵树，current指向当前运行渲染的树RootFiber， 另一颗workinProgress为正在进行中对比的树。


<!-- 创建workInProgress -->
创建 workInProgress，然后创建 ReactFiberWorkLoop 文件(fiber工作循环)中render.
初次渲染，定义一个 workInProgress,将workInProgress作为fiber传入render中，赋值给当前文件的workInProgress 。

--> performUnitOfWork中获取当前fiber与之前alternate得fiber进行 beginWork（）

--> ReactFiberBeginWork.js中 beginWork获取当前fiber的节点，进行判断，进入mountIndeterminateComponent.

--> mountIndeterminateComponent中返回value(即函数返回jsx组件)，进入 renderWithHooks 函数

--> renderWithHooks , 这里需要理解不同阶段挂载不同hook函数。
HookDispatcherOnMount对象即挂载时期，这里的useReducer即挂载mountReducer函数

--> 返回mountIndeterminateComponent中，我们已经完成初次hook渲染，开始构建儿子


<!-- updateReduer -->

更新阶段走 updateFunctionComponent --》 renderWithHooks中会判断有没有老fiber --> 如果有   ReactCurrentDispatcher.current = HookDispatcherOnUpdate 

然后我们调用的reducer,实际上是updateReducer, 通过 updateWorkInProgressHook 获取 老fiber身上挂载的hook,生成最新的链表

<!-- useState -->
实际就是useReducer的语法糖


 - dispatchAction中通过获取上次状态，与本次状态对比，如果相同避免重复更新。 Object.is(eagerReducer, lastRenderedState)
 
