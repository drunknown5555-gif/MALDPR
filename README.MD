Codes to install for the unit test in VSC Terminal command prompt and ensure that node.js is installed

npm install @testing-library/react-native
npm install jest-expo jest

In package.json add this config:
"scripts": {
  "test": "jest"
},
"jest": {
  "preset": "jest-expo/universal"
}

Run this code as expo updated the react version recently and react-test-renderer is the older version. If not, it will show error message for the test.

npm install react@19.2.3 react-test-renderer@19.2.3 --save-exact

For running testing the test:

npm test 

For the results, the web and the node test should fail but the Android and Ios shoild be pass. If a timeout error of exceed 500ms is thrown, run npm test again.
