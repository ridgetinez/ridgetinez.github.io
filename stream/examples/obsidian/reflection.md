---
id: sample-reflection
date: 2026-10-24T10:42:00+11:00
tags: [maths]
publish: true
transcript: >-
  I keep getting stuck on this reflection problem. If A sits on the mirror line, reflecting P should leave its distance from A unchanged. I want to move P around and see what stays the same.
---
Trying to see the invariant rather than just accept the proof.

$$\|P-A\| = \|P^{\prime}-A\|$$

A small version to play with:

```js
const reflect = ({ x, y }) => ({
  x: -x,
  y,
});
```

![[Attachments/reflection.m4a]]
