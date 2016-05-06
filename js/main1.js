var data = {id: 1, name: "node1" }

var data1 = [{id: 2, name: "node2"},
            {id: 3, name: "node3"},
            {id: 4, name: "node4"},
            {id: 5, name: "node5"}]

var data2 = [{id: 6, name: "node6"},
            {id: 7, name: "node7"}]


function insertById(o, id, children) {
    //Early return
    if( o.id === id ){
      o['children'] = children;
      return o;
    }
    var result, p; 
    
    for (p in o) {
        if( o.hasOwnProperty(p) && typeof o[p] === 'object' && p != 'parent') {
            result = insertById(o[p], id, children);
            if(result){
                return result;
            }
        }
    }
    return result;
}

var newData = insertById(data, 1, data1);
console.log(newData);
var newnewData = insertById(newData, 4, data2);
console.log(newnewData)