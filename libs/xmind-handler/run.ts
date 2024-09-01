import  main  from './src'

main({
    inputFile: '通用｜企微自建应用——审批-pcp0.xmind',
    outputTypes: ['xmind', 'md', 'json'],
    outputDir: './output',
    filterMarkers: ['priority-1'],
  }).catch(console.error)
