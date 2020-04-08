# WebView

在原生页面嵌入浏览器

## 时序

### 初始化

原生应用启动 -> 原生页面初始化 -> webview组件初始化 -> web页面初始化 -> [web组件发送ready事件](https://www.npmjs.com/package/@mmstudio/aw000024)

### 原生应用调用web页面

初始化 -> 原生应用中触发事件 -> 原生应用调用web组件 -> web组件中的响应执行并返回值给原生应用

上面第二步提到的事件，可以是用户事件（比如用户点击了原生页面上某个按钮），也可以是系统事件（比如系统初始化）

示例

比如我们有一个页面，分为两部分,上面部分为原生部分实现，有一个展示文字和一个按钮

```tsx
<>
	<Text>调用页面示例</Text>
	<Button title='调用页面' onPress={a('a002')}></Button>
	<WM000001 mm={mm} uri='http://server:port/pg001.html' onReady={a('a001')}></WM000001>
</>
```

因为react的函数式组件的策略的限制，我们暂时还不能通过更方便的方法拿到webview组件对象，暂时我们可以这样操作:

1. 在页面的tpl.tsx中引入函数

	```ts
	import React, { useRef } from 'react';
	```

1. 在页面的tpl.tsx中使用全局函数生成引用对象

	```ts
	const ref001 = useRef(null);
	```

1. 在webview组件添加属性ref

	```tsx
	<>
		<WM000001 mm={mm} ref={ref001} uri='http://server:port/pg001.html' onReady={a('a001')}></WM000001>
	</>
	```

1. 在按钮事件上附加上该参数

	```tsx
	<>
		<Button title='调用页面' onPress={a('a002', ref001)}></Button>
	</>
	```

	完整的tpl.tsx如下：

	```tsx
	import am1 from '@mmstudio/am000001';
	import React, { useRef } from 'react';
	import { Button, Text } from 'react-native';
	import WM000001 from '@mmstudio/wm000001';

	export default function tpl(a: <T>(action: string, ...args: unknown[]) => ((...args: unknown[]) => void), s: (...class_names: string[]) => {}, d: <T>(d: string) => T, mm: am1) {
		const ref001 = useRef(null);
		return (<>
			<Text>调用页面示例</Text>
			<Button title='调用页面' onPress={a('a002', ref001)}></Button>
			<WM000001 mm={mm} ref={ref001} uri='http://server:port/pg001.html' onReady={a('a001')}></WM000001>
		</>);
	}
	```

1. 在响应a002.ts中调用webview控件的fire方法

	```ts
	import am1 from '@mmstudio/am000001';
	import { RefObject } from 'react';
	import WM000001 from '@mmstudio/wm000001';

	export default async function a002(mm: am1, e: unknown, ref: RefObject<WM000001>, ...args: unknown[]) {
		const webview = ref.current!;
		interface Result {
			// todo
		}
		const r001 = await webview.fire<Result>('a002', { foo: 'bar' }, 3000);
		}
	}
	```

### web页面调用原生应用

初始化 -> web页面触发事件 -> [调用原生应用](https://www.npmjs.com/package/@mmstudio/aw000025) -> 原生应用响应执行并返回值 -> web页面拿到原生应用返回值

相比较来说，web页面调用原生应用比较简单，首先，没有只能在一个web组件中调用的限制,其次，也没有必须发送ready事件的限制。第三，可以使用原子操作完成调用，更方便。

示例

比如我们有一个web页面，其中某个组件中有一个按钮，用户点击时调用响应a001

```html
<input type="button" value="call native" data-mm-actions='click:a001'>
```

那么我们在响应a001.ts中可以通过调用原子操作即可

```ts
import aw1 from '@mmstudio/aw000001';
import aw25 from '@mmstudio/aw000025';

export default async function a001(mm: aw1) {
	// 调用原生响应
	/**
	 * 原生响应结果
	 */
	const r1586312934 = await (() => {
		const p1 = 'a005';	// 原生事件/响应名
		const p2 = { foo: 'mm', bar: 123 };	// 原生事件/响应参数
		const p3 = 3000;	// 超时时间
		interface Result {
			mm: string;
		}
		return aw25<Result>(p1, p2, p3);
	})();
	alert(`原生响应返回结果${JSON.stringify(r1586312934)}`);
}
```

## 其它

在混合型app应用中，建议尽量将所有业务逻辑放置在web应用中，这样可以大大加速页面的开发过程。

每个web页面中必须有且只能有一个web组件[发送ready事件](https://www.npmjs.com/package/@mmstudio/aw000024)后，才可以实现从原生应用到web页面的调用，否则，只能单向从web页面调用原生应用

有动画及对时效性要求非常高的页面（如首页展示部分），需用原生实现。

web页面跳转如果需要动画，创建多个原生页面，嵌入不同的web页面来实现，页面跳转不使用超链接，而是[调用原生响应](https://www.npmjs.com/package/@mmstudio/aw000025)，在原生响应中调用原子操作来实现页面跳转。

视频播放部分使用原生实现，可达到更流畅的效果，且支持视频格式更丰富。

调用系统功能使用原生实现，由web组件通过[原子操作](https://www.npmjs.com/package/@mmstudio/aw000025)调用

webview组件和原生应用共享cookie，所以，建议将所有服务将放置在web应用中。如果web应用占的比重较少，也可以通过nginx同域部署，在同域下共享cookie的方式来实现。
