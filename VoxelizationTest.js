// Copyright (c) 2012 Vincenzo Giovanni Comito
// See the file license.txt for copying permission.

#pragma strict

public var drawMeshShell = true;
public var drawMeshInside = true;
public var drawEmptyCube = false;
public var includeChildren = true;
public var createMultipleGrids = true;
public var meshShellPositionFromObject = Vector3.zero;
public var cubeSide = 0.1f;
private var aABCGrids : Array;

function Awake () {

}

function Start () {
//	TestTriangleIntersectionAABC();
	if(createMultipleGrids && includeChildren) {
		aABCGrids = Voxelization.CreateMultipleGridsWithGameObjectMesh(gameObject, cubeSide, drawMeshInside);
	} else {
		var thisObjGrid : Voxelization.AABCGrid;
		aABCGrids = new Array();	
		thisObjGrid = Voxelization.CreateGridWithGameObjectMesh(gameObject, cubeSide, includeChildren, drawMeshInside);
		aABCGrids.Push(thisObjGrid);
	}
	if(drawMeshShellWithParticles) {
		gameObject.AddComponent(ParticleSystem);
		particleSystem.Emit(2000);
		particleSystem.startSpeed = 0;
		particleSystem.emissionRate = 0;
		particleSystem.playOnAwake = false;
		particleSystem.startLifetime = 999999999;
		particleSystem.Simulate(1, true);
		particleSystem.startSize = cubeSide;
	}
}

function LateUpdate () {
	if(drawMeshShellWithParticles) {	
		DrawMeshShellWithParticles();
	}
}

function OnDrawGizmos () {
    Gizmos.color = Color (1,0,0,.5);
    DrawMeshShell(); 
}

function TestTriangleIntersectionAABC() {
	var triangleA : Vector3[];
	var triangleB : Vector3[];
	var triangleC : Vector3[];
	var aABCGrid = Voxelization.AABCGrid(1, 1, 1, 1, Vector3(1, 1, 1));
	var aABCVertices : Vector3[];
	
	triangleA = new Vector3[3];
	triangleA[0] = new Vector3(1, 1, 1);
	triangleA[1] = new Vector3(1, 2, 1);
	triangleA[2] = new Vector3(2, 1, 2);
	
	triangleB = new Vector3[3];
	triangleB[0] = new Vector3(2, 1, 1);
	triangleB[1] = new Vector3(1, 2, 1);
	triangleB[2] = new Vector3(1, 1, 2);
	
	triangleC = new Vector3[3];
	triangleC[0] = new Vector3(-1, -1, -2);
	triangleC[1] = new Vector3(-1, -1, -2);
	triangleC[2] = new Vector3(-1, -1, -2);
	
	print("aabc vertices:");
	aABCVertices = aABCGrid.GetAABCCorners(0, 0, 0);
	for(var i = 0; i < 8; ++i) {
		print("Vertex " + i + ": " + aABCVertices[i]);
	} 
	
	if(aABCGrid.TriangleIntersectAABC(triangleA, 0, 0, 0)) {
		print("Triangle A intersect the AABC, Test is OK");
	} else {
		print("Triangle A doesn't intersect the AABC, Test is NOT OK");	
	}
	if(aABCGrid.TriangleIntersectAABC(triangleB, 0, 0, 0)) {
		print("Triangle B intersect the AABC, Test is OK");
	} else {
		print("Triangle B doesn't intersect the AABC, Test is NOT OK");
	}	
	if(aABCGrid.TriangleIntersectAABC(triangleC, 0, 0, 0)) {
		print("Triangle C intersect the AABC, Test is NOT OK");
	} else {
		print("Triangle C doesn't intersect the AABC, Test is OK");
	}	
}

function DrawMeshShell() {
	for(var aABCGrid : Voxelization.AABCGrid in aABCGrids) {
		if(drawMeshShell && aABCGrid) {
			var cubeSize = new Vector3(cubeSide, cubeSide, cubeSide);
			var gridSize = aABCGrid.GetSize();
			for(var x = 0; x < gridSize.x; ++x) {
				for(var y = 0; y < gridSize.y; ++y) {
					for(var z = 0; z < gridSize.z; ++z) {
						var cubeCenter = aABCGrid.GetAABCCenterFromGridCenter(x, y, z) + 
								aABCGrid.GetCenter() + 
									meshShellPositionFromObject;
						if(aABCGrid.IsAABCSetted(x, y, z)) {
							Gizmos.color = Color(1, 0, 0, 0.5f);
							Gizmos.DrawCube(cubeCenter, cubeSize);
						} else if (drawEmptyCube) {
							Gizmos.color = Color(0, 1, 0, 1f);	
							Gizmos.DrawCube(cubeCenter, cubeSize);
						}
					}
				}
			}
		}	
	}
}

