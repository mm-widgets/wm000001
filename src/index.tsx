import React, { Component } from 'react';
import { Animated, Easing, ImageSourcePropType, Platform, ProgressBarAndroid, ProgressViewIOS, StyleProp, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebViewMessageEvent, WebViewProgressEvent } from 'react-native-webview/lib/WebViewTypes';
import am1 from '@mmstudio/am000001';

interface IOptionsState {
	progress: number;
	flag: boolean;
	InnerImage: ImageSourcePropType;
	OuterImage: ImageSourcePropType;
}

interface IBaseProps {
	mm: am1;
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

	onReady?(): void;
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

type Props = IProps1 | IProps2;

function responseweb(webview: WebView, { id }: IMsg, result: unknown) {
	// 这时，web中应已注册全局函数 function m${id}(content: unknown);等待调用
	// 调用web中已注册的函数，web中收到该函数后（或超时）应反注册（删除）该全局函数,该函数如果不存在也不会抛出异常，所以这里可以不用处理函数不存在的情况
	const content = JSON.stringify(result === undefined ? null : result);
	webview.injectJavaScript(`m${id}(${JSON.stringify(content)});`);	// 多一层`JSON.stringify`是为了将其变为代码的时候保证是双引号括起来的, 如content为null时， m001("null")
}

export default class extends Component<Props, IOptionsState> {
	public static defaultProps = {
		loadingBackgroundColor: 'white',
		progressBarColor: 'red'
	};
	private spinValue: Animated.Value;
	private scaleValue: Animated.Value;
	private opacityValue: Animated.Value;
	private spinAnim: Animated.CompositeAnimation;
	private scaleAnim: Animated.CompositeAnimation;
	private webview: WebView;
	public constructor(props: Props, context?: unknown) {
		super(props, context);
		this.state = {
			...props,
			InnerImage: (() => {
				if (typeof this.props.progressInnerImage === 'string') {
					return { uri: this.props.progressInnerImage };
				} else if (typeof this.props.progressInnerImage === 'number') {
					return this.props.progressInnerImage;
				}
				return require('./images/logo.png');
			})(),
			OuterImage: (() => {
				if (typeof this.props.progressOuterImage === 'string') {
					return { uri: this.props.progressOuterImage };
				} else if (typeof this.props.progressOuterImage === 'number') {
					return this.props.progressOuterImage;
				}
				return require('./images/circle.png');
			})(),
			flag: false,
			progress: 0
		};
		this.spinValue = new Animated.Value(0);
		this.scaleValue = new Animated.Value(0);
		this.opacityValue = new Animated.Value(1);
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

	public fire<T>(action: string, msg: unknown, timeout: number) {
		const id = uuid();
		const m = {
			action,
			content: msg === undefined ? null : msg,
			id,
			type: MessageType.native2web
		};
		const content = JSON.stringify(m);
		const webview = this.webview;
		// !!! ExceptionsManager.js:82 Error evaluating injectedJavaScript: This is possibly due to an unsupported return type. Try adding true to the end of your injectedJavaScript string.
		// !!! we must add `true;` at the end of the script.
		webview.injectJavaScript(`mmrn(${JSON.stringify(content)});true;`);
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
				return <ProgressViewIOS
					progress={this.state.progress}
					progressTintColor={this.props.progressBarColor}
					progressViewStyle='bar'
				></ProgressViewIOS>;
			} else if (Platform.OS === 'android') {
				return <ProgressBarAndroid
					color={this.props.progressBarColor}
					indeterminate={false}
					progress={this.state.progress}
					style={{ height: 4 }}
					styleAttr='Horizontal'
				></ProgressBarAndroid>;
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
		const props = this.props as (IProps1 & IProps2);
		const { mm, uri, html } = props;
		const emit = mm.emit;
		if (!uri && !html) {
			throw new Error('Please set the URI or HTML properties of WebView');
		}
		const source = (() => {
			if (uri) {
				return { uri };
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
					case MessageType.webready:
						{
							const ready = props.onReady;
							if (ready) {
								ready();
							}
						}
						break;
					case MessageType.native2web:
						back(data);
						break;
					case MessageType.web2native:
						// 这时，web中应已注册全局函数 function m${id}(content: unknown);等待调用
						{
							const ret = await emit(mm, data.action, data.content);	// 在响应中第一个参数为mm，第二个参数即web页面发过来的数据
							responseweb(webview, data, ret);
						}
						// 这里无法拿到页面实例，无法通过 页面实例.refs[ctl_name] 访问到webview实例
						break;
					default:
						throw new Error('Unknown message type');
				}
			}}
			ref={(ins) => {
				this.webview = ins!;
			}}
			source={source}
			userAgent='mm-hybrid'
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
	webready,
	web2native,
	native2web
}

interface IMsg {
	id: string;
	type: MessageType;
	action: string; // a001
	content: unknown;
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

function uuid() {
	return Math.random().toString().substr(2);
}
