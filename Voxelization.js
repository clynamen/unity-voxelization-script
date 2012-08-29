// Copyright (c) 2012 Vincenzo Giovanni Comito
// See the file license.txt for copying permission.

// Voxelization.js
// Written by Clynamen, 23/08/2012
// Utility for voxelization of a mesh.
// Thanks to Mike Vandelay for the 
// AABB-Triangle SAT implementation in C++.

#pragma strict

static var MAX_FLOAT : float = 9999999999999999f;
static var MIN_FLOAT : float = -9999999999999999f;

public class GridSize {

	public var x : int;
	public var y : int;
	public var z : int;
	public var side : float;
	
	public function GridSize(gridSize : GridSize) {
		this.x = gridSize.x;
		this.y = gridSize.y;
		this.z = gridSize.z;
		this.side = gridSize.side;
	}
	
	public function GridSize(x : int, y : int, z :int, side : float) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.side = side;
	}
	
};

static public class Voxelization {

public class AABCGrid {

private var side : float;
private var width : short;
private var height : short;
private var depth : short;
private var origin : Vector3;
private var cubeSet : boolean[,,];
private var	cubeNormalSum : short[,,];
private var debug = false;

protected class AABCPosition {

	public var x : short;
	public var y : short;
	public var z : short;
	
	public function AABCPosition(aABCPosition : AABCPosition) {
		this.x = aABCPosition.x;
		this.y = aABCPosition.y;
		this.z = aABCPosition.z;
	}
	
	public function AABCPosition(x : short, y : short, z : short) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	
};

public class AABC extends AABCPosition {

	private var grid : AABCGrid;
	
	public function AABC(aABC : AABC) {
		super(aABC.x, aABC.y, aABC.z);
		this.grid = aABC.grid;
	}	
	
	public function AABC(x : short, y : short, z : short, grid : AABCGrid) {
		super(x, y, z);
		this.x = x;
		this.y = y;
		this.z = z;
		this.grid = grid;
	}
	
	public function AABC(position : AABCPosition, grid : AABCGrid) {
		super(position.x, position.y, position.z);
		this.grid = grid;
	}
	
	public function GetCenter() : Vector3 {
		return grid.GetAABCCenter(x, y, z);
	}
	
	public function GetGrid() : AABCGrid {
		return grid;
	}
	
	public function IsSet() : boolean {
		return grid.IsAABCSet(x, y, z);
	}
	
	public function GetCorners(x : short, y : short, z : short) : Vector3[] {
		return grid.GetAABCCorners(x, y, z);
	}
	
};

protected class AABCGridIteratorBase {

	protected var grid : AABCGrid;
	protected var position : AABCPosition;
	
	protected function AABCGridIteratorBase(grid : AABCGrid) {
		this.grid = grid;
	}
	
	public function HasNext() : boolean {}
	
	public function Next() : AABC {}
	
};

public class AABCGridIterator extends AABCGridIteratorBase {
	
	public function AABCGridIterator(grid : AABCGrid) {
		super(grid);
	}
	
	public function HasNext() : boolean {
		if (position.x == grid.width && 
			position.y == grid.height && 
			position.z == grid.depth) {
			return false;
		}
		return true;
	}
	
	public function Next() : AABC {
		position.z++;
		if (position.z == grid.depth) {
			position.z = 0;
			position.y++;
			if (position.y == grid.height) {
				position.y = 0;
				position.x++;
				if (position.x > grid.width) {
					throw new System.IndexOutOfRangeException();
				}
			}
		}
		return AABC(position,  grid);
	}	
	
}

public class AABCGridSetAABCIterator extends AABCGridIteratorBase {
	private var nextFound : boolean;
	private var nextPosition : AABCPosition;
	
	public function AABCGridSetAABCIterator(grid : AABCGrid) {
		super(grid);
		position = new AABCPosition(0, 0, 0);
		if (grid.IsAABCSet(position)) {
			nextPosition = position;
		}
		nextFound = true;
	}

	public function HasNext() : boolean {
		if (!nextFound) {
			return FindNext();
		}
		return true;
	}
	
	public function Next() : AABC {
		if (!nextFound) {
			FindNext();
		}
		position = nextPosition;
		nextFound = false;
		return AABC(position, grid);
	}
	
	private function FindNext() : boolean {
		nextPosition = new AABCPosition(position);
		nextPosition.z++;
		for (; nextPosition.x < grid.width; nextPosition.x++) {
			for (; nextPosition.y < grid.height; nextPosition.y++) {
				for (; nextPosition.z < grid.depth; nextPosition.z++) {
					if (grid.IsAABCSet(nextPosition.x, nextPosition.y, nextPosition.z)) {
						nextFound = true;
						return true;	
					}
				}
				nextPosition.z = 0;
			}
			nextPosition.y = 0;
		}
		nextFound = false;
		return false;
	}
}

public function AABCGrid(x : short, y : short, z : short, sideLength : float) {
	width = x;
	height = y;
	depth = z;
	side = sideLength;
	origin = new Vector3();
	cubeSet = new boolean[width, height, depth];
}

public function AABCGrid(x : short, y : short, z : short, sideLength : float, ori : Vector3) {
	width = x;
	height = y;
	depth = z;
	
	side = sideLength;
	origin = ori;
	cubeSet = new boolean[width, height, depth];
}

public function CleanGrid() {
	cubeSet = new boolean[width, height, depth];	
}

public function SetDebug(debug : boolean) {
	this.debug = debug;
}

public function GetSize() : GridSize {
	return GridSize(width, height, depth, side);
}

public function SetSize(dimension : GridSize) {
	SetSize(dimension.x, dimension.y, dimension.z, dimension.side);
}

public function SetSize(x : short, y : short, z : short, sideLength : float) {
	width = x;
	height = y;
	depth = z;
	side = sideLength;
	CleanGrid();
}

public function GetCenter() : Vector3 {
	return origin + Vector3(width / 2 * side, height / 2 * side, depth / 2 * side);
}

public function SetCenter(pos : Vector3) {
	origin = pos - Vector3(width / 2 * side, height / 2 * side, depth / 2 * side);
}

public function GetSetAABCCount() : int {
	var count = 0;
	for (var x = 0; x < width; ++x) {
		for (var y = 0; y < height; ++y) {
			for (var z = 0; z < depth; ++z) {
				if (!IsAABCSet(x, y, z)) {
					count++;
				}
			}
		}
	}
	return count;
} 

public function GetAABCCorners(pos : AABCPosition) : Vector3[] {
	CheckBounds(pos.x, pos.y, pos.z);
	return GetAABCCornersUnchecked(pos.x, pos.y, pos.z);
}

public function GetAABCCorners(x : short, y : short, z : short) : Vector3[] {
	return GetAABCCornersUnchecked(x, y, z);
}

protected function GetAABCCornersUnchecked(x : short, y : short, z : short) : Vector3[] {
	var center = new Vector3(x * side + side / 2, y * side + side / 2, z * side + side / 2);
	var corners = new Vector3[8];
	corners[0] = Vector3(center.x + side, center.y - side, center.z + side) + origin;
	corners[1] = Vector3(center.x + side, center.y - side, center.z - side) + origin;
	corners[2] = Vector3(center.x - side, center.y - side, center.z - side) + origin;
	corners[3] = Vector3(center.x - side, center.y - side, center.z + side) + origin;
	corners[4] = Vector3(center.x + side, center.y + side, center.z + side) + origin;
	corners[5] = Vector3(center.x + side, center.y + side, center.z - side) + origin;
	corners[6] = Vector3(center.x - side, center.y + side, center.z - side) + origin;
	corners[7] = Vector3(center.x - side, center.y + side, center.z + side) + origin;
	return corners;	
}

public function GetAABCCenter(pos : AABCPosition) : Vector3 {
	CheckBounds(pos.x, pos.y, pos.z);
	return GetAABCCenterUnchecked(pos.x, pos.y, pos.z);
}

public function GetAABCCenter(x : short, y : short, z : short) : Vector3 {
	CheckBounds(x, y, z);
	return GetAABCCenterUnchecked(x, y, z);
}

protected function GetAABCCenterUnchecked(x : short, y : short, z : short) : Vector3 {
	return GetAABCCenterFromGridCenterUnchecked(x, y, z) + GetCenter();
}

public function GetAABCCenterFromGridOrigin(pos : AABCPosition) : Vector3 {
	CheckBounds(pos.x, pos.y, pos.z);
	return GetAABCCenterFromGridOriginUnchecked(pos.x, pos.y, pos.z);
}

public function GetAABCCenterFromGridOrigin(x : short, y : short, z : short) : Vector3 {
	CheckBounds(x, y, z);
	return GetAABCCenterFromGridOriginUnchecked(x, y, z);
}

protected function GetAABCCenterFromGridOriginUnchecked(x : short, y : short, z : short) : Vector3 {
	return Vector3(x * side + side / 2, y * side + side / 2, z * side + side / 2); 
}

public function GetAABCCenterFromGridCenter(pos : AABCPosition) : Vector3 {
	CheckBounds(pos.x, pos.y, pos.z);
	return GetAABCCenterFromGridCenterUnchecked(pos.x, pos.y, pos.z);
}

public function GetAABCCenterFromGridCenter(x : short, y : short, z : short) : Vector3 {
	CheckBounds(x, y, z);
	return GetAABCCenterFromGridCenterUnchecked(x, y, z);
}

protected function GetAABCCenterFromGridCenterUnchecked(x : short, y : short, z : short) : Vector3 {
	return Vector3(side * (x + 1 / 2 - width / 2), 
					side * (y + 1 / 2 - height / 2), 
					side * (z + 1 / 2 - depth / 2)); 
}

public function IsAABCSet(pos : AABCPosition) : boolean {
	CheckBounds(pos.x, pos.y, pos.z);
	return IsAABCSetUnchecked(pos.x, pos.y, pos.z);
}

public function IsAABCSet(x : short, y : short, z : short) : boolean {
	CheckBounds(x, y, z);
	return IsAABCSetUnchecked(x, y, z);
}

protected function IsAABCSetUnchecked(x : short, y : short, z : short) : boolean {
	return cubeSet[x, y, z];  
}

public function TriangleIntersectAABC(triangle : Vector3[], pos : AABCPosition) : boolean {
	CheckBounds(pos.x, pos.y, pos.z);
	return TriangleIntersectAABCUnchecked(triangle, pos.x, pos.y, pos.z);
}

public function TriangleIntersectAABC(triangle : Vector3[], x : short, y : short, z : short) : boolean {
	CheckBounds(x, y, z);
	return TriangleIntersectAABCUnchecked(triangle, x, y, z);
}

protected function TriangleIntersectAABCUnchecked(triangle : Vector3[], x : short, y : short, z : short) : boolean {
	var aabcCorners : Vector3[];
	var triangleEdgeA : Vector3;
	var triangleEdgeB : Vector3;
	var triangleEdgeC : Vector3;
	var triangleNormal : Vector3;
	var aabcEdgeA = new Vector3(1, 0, 0);	
	var aabcEdgeB = new Vector3(0, 1, 0);	
	var aabcEdgeC = new Vector3(0, 0, 1);	
	
	aabcCorners = GetAABCCornersUnchecked(x, y, z);
	
	triangleEdgeA = triangle[1] - triangle[0];
	triangleEdgeB = triangle[2] - triangle[1];
	triangleEdgeC = triangle[0] - triangle[2];
	
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeA, aabcEdgeA))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeA, aabcEdgeB))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeA, aabcEdgeC))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeB, aabcEdgeA))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeB, aabcEdgeB))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeB, aabcEdgeC))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeC, aabcEdgeA))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeC, aabcEdgeB))) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, Vector3.Cross(triangleEdgeC, aabcEdgeC))) return false;
	
	triangleNormal = Vector3.Cross(triangleEdgeA, triangleEdgeB);
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, triangleNormal)) return false;
	
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, aabcEdgeA)) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, aabcEdgeB)) return false;
	if (!ProjectionsIntersectOnAxis(aabcCorners, triangle, aabcEdgeC)) return false;

	return true;	
}

protected function CheckBounds(x : short, y : short, z : short) {
	if(x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= depth) {
		throw new System.ArgumentOutOfRangeException("The requested AABC is out of the grid limits.");
	}
}

public function FillGridWithGameObjectMeshShell(gameObj : GameObject) {
	FillGridWithGameObjectMeshShell(gameObj, false);
}

public function FillGridWithGameObjectMeshShell(gameObj : GameObject, storeNormalSum : boolean) {
	var gameObjMesh = gameObj.GetComponent(MeshFilter).mesh;
	var gameObjTransf = gameObj.transform;
	var triangle = new Vector3[3];	
	var startTime = Time.realtimeSinceStartup;
	var meshVertices = gameObjMesh.vertices;
	var meshTriangles = gameObjMesh.triangles;
	var meshTrianglesCount = meshTriangles.length / 3;
	var x : short;
	var y : short;
	var z : short;
	var ignoreNormalRange = 0;
	// In this method we can also evaluate stores the normals of the triangles 
	// that intersect the cube.
	if (storeNormalSum) {
		cubeNormalSum = new short [width, height, depth];
	}
	if(debug) {
		Debug.Log("Start:");
		Debug.Log("Time: " + startTime);
		Debug.Log("		Mesh Description: ");
		Debug.Log("Name: " + gameObjMesh.name);
		Debug.Log("Triangles: " + meshTrianglesCount);
		Debug.Log("Local AABB size: " + gameObjMesh.bounds.size);
		Debug.Log("		AABCGrid Description:");
		Debug.Log("Size: " + width + ',' + height + ',' + depth);
	}
	
	// For each triangle, perform SAT intersection check with the AABCs within the triangle AABB.
	for (var i = 0; i < meshTrianglesCount; ++i) {
		triangle[0] = gameObjTransf.TransformPoint(meshVertices[meshTriangles[i * 3]]);
		triangle[1] = gameObjTransf.TransformPoint(meshVertices[meshTriangles[i * 3 + 1]]);
		triangle[2] = gameObjTransf.TransformPoint(meshVertices[meshTriangles[i * 3 + 2]]);
		// Find the triangle AABB, select a sub grid.
		var startX = Mathf.Floor((Mathf.Min([triangle[0].x, triangle[1].x, triangle[2].x]) - origin.x) / side);
		var startY = Mathf.Floor((Mathf.Min([triangle[0].y, triangle[1].y, triangle[2].y]) - origin.y) / side);
		var startZ = Mathf.Floor((Mathf.Min([triangle[0].z, triangle[1].z, triangle[2].z]) - origin.z) / side);
		var endX = Mathf.Ceil((Mathf.Max([triangle[0].x, triangle[1].x, triangle[2].x]) - origin.x) / side);
		var endY = Mathf.Ceil((Mathf.Max([triangle[0].y, triangle[1].y, triangle[2].y]) - origin.y) / side);
		var endZ = Mathf.Ceil((Mathf.Max([triangle[0].z, triangle[1].z, triangle[2].z]) - origin.z) / side);
		if (storeNormalSum) {
			for (x = startX; x <= endX; ++x) {
				for (y = startY; y <= endY; ++y) {
					for (z = startZ; z <= endZ; ++z) {
						if (TriangleIntersectAABC(triangle, x, y, z)) {
							var triangleNormal = GetTriangleNormal(triangle);
							cubeSet[x, y, z] = true;
							if (triangleNormal.z < 0 - ignoreNormalRange) {
								cubeNormalSum[x, y, z]++;
							} else if (triangleNormal.z > 0 + ignoreNormalRange){
								cubeNormalSum[x, y, z]--;
							}
						}
					}
				}
			}
		} else {
			for (x = startX; x < endX; ++x) {
				for (y = startY; y < endY; ++y) {
					for (z = startZ; z < endZ; ++z) {
						if (!IsAABCSet(x, y, z) && TriangleIntersectAABC(triangle, x, y, z)) {
							cubeSet[x, y, z] = true;
						}
					}
				}
			}
		}
	}	
	if(debug) {
		Debug.Log("Grid Evaluation Ended!");
		Debug.Log("Time spent: " + (Time.realtimeSinceStartup - startTime) + "s");
		Debug.Log("End: ");	
	}
}

public function FillGridWithGameObjectMesh(gameObj : GameObject) {
	FillGridWithGameObjectMeshShell(gameObj, true);
	
	for (var x = 0; x < width; ++x) {
		for (var y = 0; y < height; ++y) {
			var fill = false;
			var cubeToFill = 0;
			for (var z = 0; z < depth; ++z) {
				if (cubeSet[x, y, z]) {
					var normalSum = cubeNormalSum[x, y, z];
					if (normalSum) {
						if (normalSum > 0) {
							fill = true;
						} else {
							fill = false;
							while (cubeToFill > 1) {
								cubeToFill--;
								cubeSet[x, y, z - cubeToFill] = true;
							}
						}
						cubeToFill = 0;
					}
					continue;
				}
				if (fill) {
					cubeToFill++;
				}
			}
		}
	}
	cubeNormalSum = null;
}

public function AddParticles(particles : ParticleSystem.Particle[], particlesToAdd : int) : ParticleSystem.Particle[] {
	var settedAABCCount = GetSetAABCCount();
	var particlesPerAABC : int;
	var randMax = side/2;
	var addedParticles = 0;
	var cube : AABC;
	var i = 0;
	
	if (particlesToAdd <= 0) {
		throw new System.ArgumentException("The number of particles to add is < 0");
	}
	
	particlesPerAABC = particlesToAdd / settedAABCCount;
	if (particlesPerAABC <= 0) {
		particlesPerAABC = 1;
	}
	
	while (particlesToAdd > 0) {
		var iter = AABCGridSetAABCIterator(this);
		var cubeFilledCount = 0;		
		while (iter.HasNext()) {
			cube = iter.Next();
			for (; i < addedParticles + particlesPerAABC && particlesToAdd > 0; ++i) {
				particles[i].position = cube.GetCenter() + 
								Vector3(Random.Range(-randMax, randMax), 
										Random.Range(-randMax, randMax), 
										Random.Range(-randMax, randMax)) / 100;
				particlesToAdd--;
			}
			addedParticles += particlesPerAABC;
			cubeFilledCount++;
			if (particlesToAdd <= 0) {
				break;
			}
		}
		if (particlesToAdd > 0) {
			particlesPerAABC = 1;
		} 
	}
	
	return particles;
}

};

public function ProjectionsIntersectOnAxis(solidA : Vector3[], solidB : Vector3[], axis : Vector3) : boolean {
	var minSolidA = MinOfProjectionOnAxis(solidA, axis);
	var maxSolidA = MaxOfProjectionOnAxis(solidA, axis);
	var minSolidB = MinOfProjectionOnAxis(solidB, axis);
	var maxSolidB = MaxOfProjectionOnAxis(solidB, axis);
	
	if (minSolidA > maxSolidB) { 
		return false;
	}
	if (maxSolidA < minSolidB) {
		return false;
	}
	
	return true;    
}

public function MinOfProjectionOnAxis(solid : Vector3[], axis : Vector3) : float {
	var min = MAX_FLOAT;
	var dotProd : float;
	
	for (var i = 0; i < solid.Length; ++i) {
		dotProd = Vector3.Dot(solid[i], axis);
		if (dotProd < min) { 
	      	min = dotProd; 
	    }
    }
  	return min;
}

public function MaxOfProjectionOnAxis(solid : Vector3[], axis : Vector3) : float {
	var max = MIN_FLOAT; 
	var dotProd : float;

	for (var i = 0; i < solid.Length; ++i) {
		dotProd = Vector3.Dot(solid[i], axis);
		if (dotProd > max) {
			max = dotProd;
		}
	}
	return max;
}

// Return a vector with the minimum components
public function MinVectorComponents(a : Vector3, b : Vector3) : Vector3 {
	var ret = new Vector3();
	ret.x = Mathf.Min(a.x, b.x);
	ret.y = Mathf.Min(a.y, b.y);
	ret.z = Mathf.Min(a.z, b.z);
	return ret;
}

// Return a vector with the minimum components
public function MaxVectorComponents(a : Vector3, b : Vector3) : Vector3 {
	var ret = new Vector3();
	ret.x = Mathf.Max(a.x, b.x);
	ret.y = Mathf.Max(a.y, b.y);
	ret.z = Mathf.Max(a.z, b.z);
	return ret;
}

public function GetTriangleNormal(triangle : Vector3[]) : Vector3 {
	return Vector3.Cross(triangle[1] - triangle[0], triangle[2] - triangle[0]).normalized;
}

// Return an AABB which include the meshes of the object itself and of its children
public function GetTotalBoundsOfGameObject(gameObj : GameObject) : Bounds {
	var totalBounds = new Bounds();
	var min : Vector3;
	var max : Vector3;
	if (gameObj.renderer) {
		min = gameObj.renderer.bounds.min;
		max = gameObj.renderer.bounds.max;
	}
	
	for (var i = 0; i < gameObj.transform.GetChildCount(); ++i) {
		var childObj = gameObj.transform.GetChild(i).gameObject;
		var childTotalBounds = GetTotalBoundsOfGameObject(childObj);
		min = Voxelization.MinVectorComponents(min, childTotalBounds.min);
		max = Voxelization.MaxVectorComponents(max, childTotalBounds.max);
	}
	
	totalBounds.SetMinMax(min, max);
	return totalBounds;
}

public function GetChildrenWithMesh(gameObj : GameObject) : Array {
	var ret = new Array();
	for (var i = 0; i < gameObj.transform.GetChildCount(); ++i) {
		var childObj = gameObj.transform.GetChild(i).gameObject;
		if (childObj.renderer) {
			ret.Push(childObj);
		}
		ret = ret.Concat(GetChildrenWithMesh(childObj));
	}	
	return ret;
}

// Warning: this method creates a grid at least as big as the total bounding box of the
// game object, if children are included there may be empty space. Consider to use 
// CreateMultipleGridsWithGameObjectMeshShell in order to save memory.
public function CreateGridWithGameObjectMesh(gameObj : GameObject, 
								cubeSide : float, includeChildren : boolean, includeInside : boolean) : AABCGrid {
	var aABCGrid : AABCGrid;
	var width : short;
	var height : short;
	var depth : short;
	var origin = new Vector3();
	var gameObjectsWithMesh : Array;
	var gridBoundsMin = new Vector3(MAX_FLOAT, MAX_FLOAT, MAX_FLOAT);
	var gridBoundsMax = new Vector3(MIN_FLOAT, MIN_FLOAT, MIN_FLOAT);
	
	if (includeChildren) {
		gameObjectsWithMesh = GetChildrenWithMesh(gameObj);
	} else {
		gameObjectsWithMesh = new Array();
	}
	if (gameObj.renderer) {
		gameObjectsWithMesh.Push(gameObj);
	}
	
	
	for (var gameObjectWithMesh : GameObject in gameObjectsWithMesh) {
		gridBoundsMin = Voxelization.MinVectorComponents(gridBoundsMin, 
									gameObjectWithMesh.renderer.bounds.min);
		gridBoundsMax = Voxelization.MaxVectorComponents(gridBoundsMax, 
									gameObjectWithMesh.renderer.bounds.max);
	}		
	width = Mathf.Ceil((gridBoundsMax.x - gridBoundsMin.x) / cubeSide) + 2;
	height = Mathf.Ceil((gridBoundsMax.y - gridBoundsMin.y) / cubeSide) + 2;
	depth = Mathf.Ceil((gridBoundsMax.z - gridBoundsMin.z) / cubeSide) + 2;
	origin = gridBoundsMin - Vector3(cubeSide, cubeSide, cubeSide);
	aABCGrid = new AABCGrid(width, height, depth, cubeSide, origin);
	for (var gameObjectWithMesh : GameObject in gameObjectsWithMesh) {
		if (includeInside) {
			aABCGrid.FillGridWithGameObjectMesh(gameObjectWithMesh);
		} else {
			aABCGrid.FillGridWithGameObjectMeshShell(gameObjectWithMesh);
		}
	}
	
	return aABCGrid;
} 

public function CreateMultipleGridsWithGameObjectMesh(gameObj : GameObject, 
								cubeSide : float, includeMeshInside : boolean) : Array {
	var gameObjectsWithMesh : Array;
	var grids = new Array();
	
	gameObjectsWithMesh = GetChildrenWithMesh(gameObj);
	if (gameObj.renderer) {
		gameObjectsWithMesh.Push(gameObj);
	}
	
	for (var gameObjWithMesh : GameObject in gameObjectsWithMesh) {
		grids.Push(CreateGridWithGameObjectMesh(gameObjWithMesh, cubeSide, false, includeMeshInside));
	}
	
	return grids;
}

};
