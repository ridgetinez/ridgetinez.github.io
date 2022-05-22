---
layout: post
title: "Distributed: FAULT TOLERANT ROTORS FOR YOUR DISTRIBUTED GOPHERS" 
description: Learning and implementing distributed systems, a dev log.
summary: Introducing my goals of the distributed challenge.
tags: [distributed, golang]
---

Long time no write! I’ll make a bet that my blog updates will be more frequent from now on.

I’m currently going through [MIT 6.824](https://pdos.csail.mit.edu/6.824/) as a base course to get some experience with implementing distributed systems. The labs involve writing some code that gets executed in a simulated network environment hosted locally. But I feel this is a bit like cheating for a whole bunch of reasons!

- All processes have access to a shared local filesystem where many operations are guaranteed to be atomic at the syscall level. That’s a strong guarantee that we might not be able to rely on when the distributed workers are on separate machines.
- Communication between workers is done with IPC. In the MapReduce lab it’s through UNIX sockets which relies on a shared filesystem. In the second lab we’re using goroutines and channels. Because it’s all on one computer, it’s easy to simulate network failures which is awesome for local testing, but are there learnings we’re missing when working with real networks? On a first thonk, I don’t think there’s too much we’re missing… but this is surely a case of Dunning Kruger.
- I’m not deploying on real hardware that’s production ready! The easiest way to do this is to work with cloud providers like AWS in order to get my code on real instances and deal with the problems I’d likely see in a job doing this stuff full-time. Not to say that’s my goal, but seeing things to their logical end is definitely fulfilling.
- Not a point for cheating: but developing a local solution and a “real” distributed solution means that I have to search for abstractions that’s useful between the two so I can re-use as much code as I can.

So I’m making a promise to myself that I’m going through this course with the intention of running things on real… well everything! A real network, real distributed file system, real computers running my code, real hair pulling moments when my code on those computers suck. To add more “real-life” to this, I also need to host my solutions on this website. That’ll make me think about rate-limiting, authentication, abuse vectors (I definitely don’t want my infrastructure to be doing illegal things!) and simple web UIs.

That’s a lot of promises. Hoping I can keep this writing thing going. [Letsa go](https://www.youtube.com/watch?v=ve8r3OjrZhM)!
