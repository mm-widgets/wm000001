import { ProgressBar } from '@react-native-community/progress-bar-android';
import { ProgressView } from '@react-native-community/progress-view';
import React, { Component } from 'react';
import { Animated, Easing, ImageSourcePropType, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebViewMessageEvent, WebViewProgressEvent } from 'react-native-webview/lib/WebViewTypes';

interface IOptionsState {
	progress: number;
	flag: boolean;
	InnerImage: ImageSourcePropType;
	OuterImage: ImageSourcePropType;
}

interface IBaseProps {
	onMessage?(type: string, msg: unknown): unknown;
	/**
	 * 进度条的环部分
	 */
	progressOuterImage?: string | number;
	/**
	 * 进度条的中间部分
	 */
	progressInnerImage?: string | number;
	/**
	 * 进度条的颜色(顶部)
	 */
	progressBarColor?: string;
	/**
	 * Boolean value that forces the `WebView` to show the loading view
	 * on the first load.
	 */
	startInLoadingState?: boolean;
	/**
	 * Boolean value that determines whether a horizontal scroll indicator is
	 * shown in the `WebView`. The default value is `true`.
	 */
	showsHorizontalScrollIndicator?: boolean;
	/**
	 * Boolean value that determines whether a vertical scroll indicator is
	 * shown in the `WebView`. The default value is `true`.
	 */
	showsVerticalScrollIndicator?: boolean;
	/**
	 * Boolean that controls whether the web content is scaled to fit
	 * the view and enables the user to change the scale. The default value
	 * is `true`.
	 *
	 * On iOS, when `useWebKit=true`, this prop will not work.
	 */
	scalesPageToFit?: boolean;
	/**
	 * Boolean that determines whether HTML5 audio and video requires the user
	 * to tap them before they start playing. The default value is `true`.
	 */
	mediaPlaybackRequiresUserAction?: boolean;
	/**
	 * List of origin strings to allow being navigated to. The strings allow
	 * wildcards and get matched against *just* the origin (not the full URL).
	 * If the user taps to navigate to a new page but the new page is not in
	 * this whitelist, we will open the URL in Safari.
	 * The default whitelisted origins are "http://*" and "https://*".
	 */
	originWhitelist?: string[];
	/**
	 * Should caching be enabled. Default is true.
	 */
	cacheEnabled?: boolean;
	/**
	 * 加载时的背景颜色
	 */
	loadingBackgroundColor?: string;
	style?: StyleProp<ViewStyle>;

	onListen?(type: string, ins: MMWebview): void;
	onError?(): void;
	onLoad?(): void;
	onLoadEnd?(): void;
	onLoadStart?(): void;
}

interface IProps1 extends IBaseProps {
	uri: string;
}

interface IProps2 extends IBaseProps {
	html: string;
}

interface IProps3 extends IBaseProps {
	src: string;
}

type Props = IProps1 | IProps2 | IProps3;

function responseweb(webview: WebView, msgid: string, result: unknown) {
	// 这时，web中应已注册全局函数 function m${id}(content: unknown);等待调用
	// 调用web中已注册的函数，web中收到该函数后（或超时）应反注册（删除）该全局函数,该函数如果不存在也不会抛出异常，所以这里可以不用处理函数不存在的情况
	const content = JSON.stringify(result === undefined ? null : result);
	webview.injectJavaScript(`mm${msgid}(${JSON.stringify(content)});`);	// 多一层`JSON.stringify`是为了将其变为代码的时候保证是双引号括起来的, 如content为null时， m001("null")
}

export default class MMWebview extends Component<Props, IOptionsState> {
	public static defaultProps = {
		loadingBackgroundColor: 'white',
		progressBarColor: 'red'
	};
	private spinValue: Animated.Value;
	private scaleValue: Animated.Value;
	private opacityValue: Animated.Value;
	private spinAnim!: Animated.CompositeAnimation;
	private scaleAnim!: Animated.CompositeAnimation;
	private webview!: WebView;
	private weblisteners = new Map<string, string[]>();
	public constructor(props: Props) {
		super(props);
		this.state = {
			...props,
			InnerImage: (() => {
				if (typeof this.props.progressInnerImage === 'string') {
					return { uri: this.props.progressInnerImage };
				} else if (typeof this.props.progressInnerImage === 'number') {
					return this.props.progressInnerImage;
				}
				return require('../images/logo.png') as number;
			})(),
			OuterImage: (() => {
				if (typeof this.props.progressOuterImage === 'string') {
					return { uri: this.props.progressOuterImage };
				} else if (typeof this.props.progressOuterImage === 'number') {
					return this.props.progressOuterImage;
				}
				return require('../images/circle.png') as number;
			})(),
			flag: false,
			progress: 0
		};
		this.spinValue = new Animated.Value(0);
		this.scaleValue = new Animated.Value(0);
		this.opacityValue = new Animated.Value(1);
		// this.spinAnim = Animated.timing(this.spinValue, {
		// 	duration: 800,
		// 	easing: Easing.linear,
		// 	toValue: 1,
		// 	useNativeDriver: true
		// });
		// this.scaleAnim = Animated.sequence([
		// 	Animated.timing(this.scaleValue, { toValue: 1, useNativeDriver: true, duration: 200 }),
		// 	Animated.delay(500),
		// 	Animated.timing(this.opacityValue, { toValue: 0, useNativeDriver: true }),
		// 	Animated.timing(this.scaleValue, { toValue: 0, useNativeDriver: true, duration: 200 })
		// ]);
	}

	public componentDidMount() {
		this.spin();
		this.scale();
	}

	private scale() {
		this.opacityValue.setValue(1);
		this.scaleAnim = Animated.sequence([
			Animated.timing(this.scaleValue, { toValue: 1, useNativeDriver: true, duration: 200 }),
			Animated.delay(500),
			Animated.timing(this.opacityValue, { toValue: 0, useNativeDriver: true }),
			Animated.timing(this.scaleValue, { toValue: 0, useNativeDriver: true, duration: 200 })
		]);
		this.scaleAnim.start(() => {
			if (this.state.progress !== 1) {
				this.scale();
			}
		});
	}

	private spin() {
		this.spinValue.setValue(0);
		this.spinAnim = Animated.timing(this.spinValue, {
			duration: 800,
			easing: Easing.linear,
			toValue: 1,
			useNativeDriver: true
		});
		this.spinAnim.start(() => {
			if (this.state.progress !== 1) {
				this.spin();
			} else {
				// 不加延时的话logo会跟着转
				setTimeout(() => {
					this.setState({
						flag: true
					});
				}, 0);
			}
		});
	}

	/**
	 * 调用浏览器方法
	 * !!! 如果浏览器监听了多次，该方法只返回其中任意一个监听的返回结果
	 */
	public fire<T, M = unknown>(type: string, msg: M, timeout = 1000) {
		const id = uuid();
		const m = {
			content: msg === undefined ? null : msg,
			id,
			type: MessageType.native2web,
			msgtype: type
		};
		const content = JSON.stringify(m);
		const webview = this.webview;
		const ptype = JSON.stringify(type);
		const pcontent = JSON.stringify(content);
		const ids = this.weblisteners.get(type);
		if (!ids || ids.length === 0) {
			throw new Error('No listener');
		}
		const scripts = ids.map((id) => {
			return `mm${id}(${ptype},${pcontent})`;
		});
		// !!! ExceptionsManager.js:82 Error evaluating injectedJavaScript: This is possibly due to an unsupported return type. Try adding true to the end of your injectedJavaScript string.
		// !!! we must add `true;` at the end of the script.
		webview.injectJavaScript(`(${scripts.join(',')});true;`);
		return add<T>(m, timeout);
	}

	public render() {
		if (this.state.progress === 1) {
			this.scaleAnim.stop();
			this.spinAnim.stop();
		}
		return (<View
			style={{
				backgroundColor: '#fff',
				flex: 1
			}}
		>
			{this.render_progress_bar()}
			{this.renderWebView()}
			{this.renderLoading()}
		</View >
		);
	}

	private render_progress_bar() {
		const props = this.props as IProps1;
		if (props.uri && this.state.progress !== 1) {
			if (Platform.OS === 'ios') {
				return <ProgressView
					progress={this.state.progress}
					progressTintColor={this.props.progressBarColor}
					progressViewStyle='bar'
				></ProgressView>;
			} else if (Platform.OS === 'android') {
				return <ProgressBar
					color={this.props.progressBarColor}
					indeterminate={false}
					progress={this.state.progress}
					style={{ height: 4 }}
					styleAttr='Horizontal'
				></ProgressBar>;
			}
		}
		return undefined;
	}

	private renderLoading() {
		const props = this.props as IProps1;
		if (props.uri && this.state.flag === false) {
			const outersource = this.state.OuterImage;
			const innersource = this.state.InnerImage;
			const spin = this.spinValue.interpolate({
				inputRange: [0, 1],
				outputRange: ['0deg', '360deg']
			});
			return <View
				style={{
					alignItems: 'center',
					backgroundColor: this.props.loadingBackgroundColor,
					height: '100%',
					justifyContent: 'center'
				}}
			>
				<Animated.Image
					source={outersource}
					style={{
						height: 50,
						opacity: this.opacityValue,
						transform: [
							{
								rotate: spin
							},
							{
								scale: this.scaleValue
							}
						],
						width: 50
					}}
				>
				</Animated.Image>
				<Animated.Image
					source={innersource}
					style={[
						{
							height: 40,
							opacity: this.opacityValue,
							position: 'absolute',
							width: 40
						},
						{
							transform: [
								{
									scale: this.scaleValue
								}
							]
						}
					]}
				>
				</Animated.Image>
			</View>;
		}
		return undefined;
	}

	private renderWebView() {
		const props = this.props as (IProps1 & IProps2 & IProps3);
		const { uri, html, src, onMessage } = props;
		if (!uri && !html && !src) {
			throw new Error('Please set the URI or HTML properties of WebView');
		}
		const source = (() => {
			if (uri) {
				return { uri };
			}
			if (src) {
				return { uri: src };
			}
			return { html };
		})() as { uri: string } | { html: string };
		return <WebView
			{...props}
			allowsBackForwardNavigationGestures={true}
			onMessage={async (event: WebViewMessageEvent) => {
				const data = JSON.parse(event.nativeEvent.data) as IMsg;
				const webview = this.webview;
				switch (data.type) {
					case MessageType.weblisten:
						{
							const ids = this.weblisteners.get(data.msgtype) || [];
							ids.push(data.id);
							this.weblisteners.set(data.msgtype, ids);
							const listen = props.onListen;
							if (listen) {
								listen(data.msgtype, this);
							}
						}
						break;
					case MessageType.native2web:
						back(data);
						break;
					case MessageType.native2webe:
						backe(data);
						break;
					case MessageType.web2native:
						// 这时，web中应已注册全局函数 function m${id}(content: unknown);等待调用
						if (onMessage) {
							const msg = JSON.parse(data.content as string) as unknown;
							const ret = await onMessage(data.msgtype, msg);
							responseweb(webview, data.id, ret);
						}
						// else timeout
						break;
					default:
						throw new Error('Unknown message type');
				}
			}}
			ref={(ins) => {
				this.webview = ins!;
			}}
			source={source}
			onLoadProgress={(res: WebViewProgressEvent) => {
				this.setState({
					progress: res.nativeEvent.progress
				});
			}}
		>
		</WebView>;
	}
}

enum MessageType {
	weblisten,
	web2native,
	native2web,
	native2webe
}

interface IMsg {
	id: string;
	type: MessageType;
	content: unknown;
	msgtype: string;
}

interface IDeferred<T> {
	resolve(result: T): void;
	reject(reson: Error): void;
}

const pool = new Map<string, IDeferred<unknown>>();

function add<T>(msg: IMsg, timeout: number) {
	const defferred = {} as IDeferred<T>;
	const id = msg.id;
	const handler = setTimeout(() => {
		defferred.reject(new Error('Timeout'));
	}, timeout);
	pool.set(msg.id, defferred);
	return new Promise<T>((res, rej) => {
		defferred.resolve = (value: T | PromiseLike<T>) => {
			clearTimeout(handler);
			pool.delete(id);
			res(value);
		};
		defferred.reject = (reason: Error) => {
			clearTimeout(handler);
			pool.delete(id);
			rej(reason);
		};
	});
}

function back({ id, content }: IMsg) {
	const origin = pool.get(id);
	if (origin) {
		origin.resolve(content);
	}
}

function backe({ id, content }: IMsg) {
	const origin = pool.get(id);
	if (origin) {
		origin.reject(new Error(content as string));
	}
}

function uuid() {
	return Math.random().toString().substring(2);
}
