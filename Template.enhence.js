;+function(window,document){
	
	//执行表达式
	var applyExp=function(exp,ctx){
		return Function(ctx.argNames.join(","),"return ("+exp+")").apply(ctx.this2who,ctx.argValues);
	};
	
	var handleChildNodes=function(childNodes,ctx){
		if(childNodes){
			for(var i=0,z=childNodes.length;i<z;i++){
				handleNode(childNodes[i],ctx);
			}
		}
	};
	/**
	 * 
	 * @param {Node} node
	 */
	var handleNode=function(node,ctx){
		switch (node.nodeType){
			case 1://elementNode
				switch (node.tagName){
					case "IF":
						handleIfElementNode(node,ctx);//fragment
						return;
					case "FOR":
						handleForElementNode(node,ctx);
						return;
						
				}
				handleChildNodes(node.childNodes,ctx);
				return;
			case 3://textNode
				handleTextNode(node,ctx);
				return;
		}
	};
	
	var handleIfElementNode=function(ifNode,ctx){
		//获取后面的else元素，如果有的话
		var elseNode=ifNode.nextElementSibling;
		if(elseNode==null||elseNode.tagName!=="ELSE"){
			elseNode=null;
		}
		
		var exp=ifNode.getAttribute("test");
		if(exp){
			if(applyExp(exp,ctx)){
				//克隆if代码块
				var fg=document.createDocumentFragment();
				var ifNodeClone=ifNode.cloneNode(true);
				while(child=ifNodeClone.firstChild) {
					fg.appendChild(child);
				}
				handleChildNodes(fg.childNodes,ctx);
				ifNode.content=fg;
				//不处理后面的else了
			}else{
				//处理后面的else
				if(elseNode){
					handleElseElementNode(elseNode);
				}
			}
		}
	};
	/**
	 * 处理else标签
	 * @param {Object} ifNode
	 * @param {Object} ctx
	 */
	var handleElseElementNode=function(elseNode,ctx){
		var fg=document.createDocumentFragment();
		var elseNodeClone=elseNode.cloneNode(true);
		while(child=elseNodeClone.firstChild) {
			fg.appendChild(child);
		}
		handleChildNodes(fg.childNodes,ctx);
		elseNode.content=fg;
	};
	var handleForElementNode=function(forNode,ctx){
		//获取遍历集合或对象名称
		var forItemsExp=forNode.getAttribute("items");
		//执行表达式获取遍历目标
		var items=applyExp(forItemsExp,ctx);
		if(!items){
			//目标不存在，直接退出
			return;
		}
		//循环临时变量名称
		var varName=forNode.getAttribute("var");
		//循环临时变量名称放入执行上下文
		ctx.argNames.push(varName);
		//获取遍历对象名称
		var varStatusName=forNode.getAttribute("varStatus");
		//遍历对象名称放入执行上下文
		ctx.argNames.push(varStatusName||"varStatus");
		
		
		//循环体转换为fragment便于处理
		var fg=document.createDocumentFragment();
		var forNodeClone=forNode.cloneNode(true);
		for(var child;child=forNodeClone.firstChild;fg.appendChild(child));
		
		//循环结果片段
		var forResultFragment=document.createDocumentFragment();
		//循环临时变量值
		var varValue=null;
		//循环对象值
		var varStatus={};
		//循环体片段克隆
		var cloneFragment;
		//有length属性，数组或伪数组
		if(items.length){
			for(var i=0,z=items.length;i<z;i++){
				varValue=items[i];
				varStatus.count=i+1;
				varStatus.index=i;
				ctx.argValues.push(varValue);
				ctx.argValues.push(varStatus);
				
				cloneFragment=fg.cloneNode(true);
				handleChildNodes(cloneFragment.childNodes,ctx);
				ctx.argValues.length-=2;//去掉两个参数值
				forResultFragment.appendChild(cloneFragment);
			}
		}else{//遍历对象
			var key;
			var i=0;
			for(key in items){
				if(items.hasOwnProperty(key)){
					varValue={key:key,value:items[key]};
					varStatus.count=i+1;
					varStatus.index=i;
					ctx.argValues.push(varValue);
					ctx.argValues.push(varStatus);
					cloneFragment=fg.cloneNode(true);
					handleChildNodes(cloneFragment.childNodes,ctx);
					ctx.argValues.length-=2;//去掉两个参数值
					forResultFragment.appendChild(cloneFragment);
				}
			}
		}
		//从上下文删除参数和值
		ctx.argNames.length-=2;//删除临时变量名称和循环变量名称
		//保存结果
		forNode.content=forResultFragment;
	};
	/**
	 * 处理文本
	 * @param {TextNode} node
	 * @param {Object} ctx 处理上下文
	 */
	var handleTextNode=function(node,ctx){
		var txt=node.nodeValue.trim();
		if(txt.length===0){
			node.textContent="";
			return;
		}
		var expBegin=-1;
		var exps=0;
		var result="";
		for(var i=0,z=txt.length,c;i<z;i++){
			switch (c=txt.charAt(i)){
				case '$':
					//test if the exp
					if(txt.charAt(i+1)==='('){
						expBegin=i+2;
						i++;//skip the ( char
						continue;
					}else{
						result+=c;
					}
					break;
				case  '('://是否是嵌套
					if(expBegin!==-1){//嵌套
						exps++;
					}else{
						result+=c;
					}
					break;
				case  ')':
					if(exps>0){//有嵌套
						exps--;
						continue;
					}
					if(expBegin!==-1){
						exp=txt.substring(expBegin,i);
						result+=applyExp(exp,ctx);
						expBegin=-1;
					}else{
						result+=c;
					}
					break;
				default:
					if(expBegin===-1){
						result+=c;
					}
					break;
			}	
		}
		node.textContent=result;
	};
	/**
	 * 删除未知子标签
	 * @param {NodeList} children
	 */
	var deleteUnKownElementChildren=function(children){
		if(children){
			var childNext=children[0];
			while(childNext){
				//返回下一个处理的标签
				childNext=deleteUnKownElementNode(childNext);
			}
		}
	};
	/**
	 * 删除位置节点（即if/else/for等）
	 * @param {HTMLElement} el 
	 */
	var deleteUnKownElementNode=function(el){
		var next=el.nextElementSibling;
		switch(el.tagName){
			case "IF":
			case "FOR":
			case "ELSE":
				//获取节点内容
				var fragment=el.content;
				//内容存在则添加到父标签
				if(fragment){
					//先递归处理子标签
					deleteUnKownElementChildren(fragment.children)
					//添加到父标签（替换内容）
                    if(el.parentNode.tagName==="TEMPLATE"){
                        el.parentNode.content.replaceChild(fragment, el);
                    }else {
                        el.parentNode.replaceChild(fragment, el);
                    }
				}else{
					//无内容，则删除标签
                    if(el.parentNode.tagName==="TEMPLATE"){
                        el.parentNode.content.removeChild(el);
                    }else {
                        el.parentNode.removeChild(el);
                    }
				}
				return next;
			default:
				//其他标签，递归处理子标签
				deleteUnKownElementChildren(el.children);
		}
		return next;
	};
	
	

	//export
	HTMLTemplateElement.prototype.generate=function(model,argName){
		//构建上下文
		var ctx={
			argNames:argName?[argName]:[],
			argValues:model?[model]:[],
			this2who:this //表达式上下文为标签本身
		};
		//clonenode
        var templateClone=this.cloneNode(true);
		//处理所有节点
		handleChildNodes(templateClone.content.childNodes,ctx);
		//删除if/for等节点
		//deleteUnKownElementChildren(templateClone.content.children);
		
		return templateClone.content;
	};
	if(window["jQuery"]){
        window["jQuery"].fn.generate=function (model,argName){
            var first=this[0];
            if(first&&first.tagName==="TEMPLATE") {
                return first.generate.apply(first, arguments);
            }
        }
    }
}(window,document);
