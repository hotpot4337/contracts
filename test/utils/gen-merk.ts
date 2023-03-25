import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { solidityKeccak256 } from 'ethers/lib/utils'

const salt = 0xDEADBEEF

function getTOTPByInterval (interval: number): number {
  const codez = [829868, 599210, 550111, 335494, 142679, 194260, 94507, 481019, 882821, 944678, 775843, 905116, 513504, 478870, 555515, 692347, 453302, 721259, 745391, 622246, 163111, 490131, 86960, 845996, 205617, 572258, 846287, 383159, 402593, 472473, 548055, 765519, 832873, 241454, 100441, 72731, 72624, 715378, 713035, 543461, 528216, 399547, 380249, 418717, 590977, 515900, 17271, 605114, 31861, 192496, 305144, 569166, 622794, 636149, 260463, 156346, 333927, 166123, 95479, 231230, 16248, 562947, 873320, 832918, 783404, 289122, 122312, 629719, 846749, 23894, 986524, 612000, 352963, 620762, 766099, 862553, 794643, 755589, 881995, 937853, 426760, 311903, 556027, 227710, 70533, 7226, 997671, 24333, 996863, 776623, 31836, 67757, 995985, 90688, 184099, 590653, 354748, 760921, 58694, 154526]
  return codez[interval]
}

export default function (): StandardMerkleTree<String[]> {
  const values: String[][] = []
  const intervalOffset = 0
  for (let i = 0; i < 10; i++) {
    // left/right pseudo-leaves, must be provided in addition to witness proving we can hash to the leaf, even after leaves are sorted
    const left = solidityKeccak256(['uint256', 'uint256'], [i, salt])
    const right = solidityKeccak256(['uint256', 'uint256'], [i, getTOTPByInterval(intervalOffset + i)])

    values.push([left, right])
  }

  // (2)
  const tree = StandardMerkleTree.of(values, ['bytes32', 'bytes32'])

  // (3)
  console.log('Merkle Root:', tree.root)
  console.log('Merkle rendered (leaves are sorted):', tree.root)
  console.log(tree.render())
  return tree
}
