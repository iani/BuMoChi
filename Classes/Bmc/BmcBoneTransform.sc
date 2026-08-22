BmcBoneTransform {
	var <values;

	*new { |values| ^super.new.init(values) }

	init { |argValues|
		if(argValues.isSequenceableCollection.not or: { argValues.size != 7 }) {
			Error("BmcBoneTransform requires [x, y, z, qx, qy, qz, qw]").throw;
		};
		values = argValues.copy;
		^this
	}

	x { ^values[0] }
	y { ^values[1] }
	z { ^values[2] }
	qx { ^values[3] }
	qy { ^values[4] }
	qz { ^values[5] }
	qw { ^values[6] }
	position { ^values.copyRange(0, 2) }
	rotation { ^values.copyRange(3, 6) }
	asArray { ^values.copy }
	copy { ^this.class.new(values) }
}
