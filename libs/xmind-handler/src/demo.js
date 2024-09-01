const fs = require('fs')
const JSZip = require('jszip')

async function readXmind(file) {
  // 读取XMind文件
  const data = await fs.promises.readFile(file)
  // 使用JSZip解压缩文件
  const zip = await JSZip.loadAsync(data)
  // 获取content.json文件内容
  const content = await zip.file('content.json').async('text')
  const jsonData = JSON.parse(content)
  // 解析JSON内容
  const filteredData = filterPriority1Nodes(jsonData)
  fs.writeFileSync('./data.json', JSON.stringify(filteredData, null, 2))
}

function filterPriority1Nodes(data) {
  const rootTopic = data[0].rootTopic
  const filteredRootTopic = filterNodeAndChildren(rootTopic)
  return [{ rootTopic: filteredRootTopic }]
}

function filterNodeAndChildren(node) {
  if (!node) return null

  let hasPriority1 = node.markers && node.markers.some((marker) => marker.markerId === 'priority-1')
  let filteredChildren = []

  if (node.children && node.children.attached) {
    filteredChildren = node.children.attached.map(filterNodeAndChildren).filter((child) => child !== null)
  }

  if (hasPriority1 || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren.length > 0 ? { attached: filteredChildren } : undefined,
    }
  }

  return null
}
// 调用函数读取XMind文件
readXmind('通用｜企微自建应用——审批-pcp0.xmind')
