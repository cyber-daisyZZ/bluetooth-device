<template>
	<view class="computing-container" :style="{height: `${windowHeight}px`}">
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
.computing-container{
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #ccc;
}
</style>
