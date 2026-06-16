# JavaScript 闭包详解

> 📅 2024-02-01 | 🏷️ JavaScript · 闭包 · 基础概念

## 什么是闭包

> **闭包** = 函数 + 该函数能访问的外部变量（词法环境）

一句话概括：**函数记住了它被创建时的作用域**，即使这个函数在别的地方被调用。

## 一个经典例子

```js
function createCounter() {
  let count = 0
  return function () {
    count++
    return count
  }
}

const counter = createCounter()
console.log(counter()) // 1
console.log(counter()) // 2
console.log(counter()) // 3
```

`createCounter` 执行完后，按理说 `count` 应该被销毁了。但因为返回的函数引用了 `count`，所以 `count` 被"记住"了。这就是闭包。

## 面试高频题：for 循环中的闭包

```js
// ❌ 错误写法
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000)
}
// 输出：3, 3, 3

// ✅ 正确写法 1：let 块级作用域
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000)
}
// 输出：0, 1, 2

// ✅ 正确写法 2：IIFE 创建闭包
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 1000)
  })(i)
}
// 输出：0, 1, 2
```

## 闭包的实际应用

### 1. 数据私有化

```js
function createWallet(initial) {
  let balance = initial
  return {
    deposit(amount) { balance += amount },
    withdraw(amount) { balance -= amount },
    getBalance() { return balance },
  }
}
```

### 2. 函数柯里化

```js
const add = (a) => (b) => a + b
const add5 = add(5)
console.log(add5(3)) // 8
```

### 3. 模块模式

```js
const MyModule = (function () {
  let privateVar = 'secret'
  return {
    getSecret() { return privateVar },
  }
})()
```

## 何时注意闭包

虽然闭包很强大，但要注意：

1. **内存占用** — 被闭包引用的变量不会被 GC 回收
2. **无意中的闭包** — 在循环或定时器中容易产生意外行为

## 总结

闭包是 JavaScript 最重要的概念之一。理解了闭包，你才算真正入门了 JavaScript。核心就一句话：

> **函数带着它的"出生地"一起旅行。**
