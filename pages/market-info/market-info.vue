<template>
	<view class="market-info-container" :style="{height: `${windowHeight}px`}">
		 <text class="text">Coming soon ...</text>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				
			}
		},
		computed: {
		  windowHeight() {
		    return uni.getSystemInfoSync().windowHeight
		  }
		},
		methods: {
			
		}
	}
</script>

<style>
.market-info-container{
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #ccc;
}
</style>
